"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; 
import { getShippingCost, CourierCode } from "@/lib/rajaongkir";
import { createSnapToken } from "@/lib/midtrans";
import { nanoid } from "nanoid";

// --- TYPES ---
interface CheckoutItemPayload {
  cart_id: string;
  variant_id: string;
  quantity: number;
  // Fields below are ignored for security (we fetch them server-side)
  price?: number; 
  weight?: number;
  product_name?: string;
  org_id: string;
  org_origin_id?: string;
}

interface ValidatedItem {
  cart_id: string;
  variant_id: string;
  quantity: number;
  price: number;        // Trusted price
  weight: number;       // Trusted weight (Fix #5)
  product_name: string;
  org_id: string;
  org_origin_id: string;// Trusted origin
}

interface ShippingSelection {
  [org_id: string]: {
    courier: CourierCode;
    service: string;
    cost: number;
  };
}

interface CouponData {
  id: string;
  code: string;
  discount_percent: number;
  min_purchase?: number;
  max_discount?: number;
  org_id?: string | null;
  expires_at: string;
}

// --- ACTION: CALCULATE SHIPPING ---
export async function calculateShippingAction(
  origin: string, 
  destination: string, 
  weight: number, 
  courier: CourierCode
) {
  return await getShippingCost({ origin, destination, weight, courier });
}

// --- ACTION: PROCESS CHECKOUT ---
export async function processCheckout(
  items: CheckoutItemPayload[],
  addressId: string,
  shippingSelections: ShippingSelection,
  _ignoredDistrictId: string, 
  couponId: string | null
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const adminSupabase = createAdminClient();
  const paymentGroupId = `PAY-${nanoid(10)}`;
  
  // Track locked resources for rollback
  const lockedStock: { variant_id: string, qty: number }[] = [];
  let couponLocked = false;

  try {
    // --- STEP 0: PRE-VALIDATION ---
    if (!items || items.length === 0) {
      throw new Error("Tidak ada barang yang dipilih.");
    }

    // 1. Fetch & Verify Address
    const { data: addressData, error: addrError } = await adminSupabase
      .from("user_addresses")
      .select("district_id, subdistrict_id")
      .eq("id", addressId)
      .eq("user_id", user.id)
      .single();

    if (addrError || !addressData) {
      throw new Error("Alamat pengiriman tidak valid atau tidak ditemukan.");
    }
    
    const destinationId = addressData.subdistrict_id?.toString() || addressData.district_id?.toString();
    if (!destinationId) throw new Error("Data wilayah alamat tidak lengkap.");

    // 2. Fetch Authoritative Product Data
    const variantIds = items.map(i => i.variant_id);
    const { data: dbVariants, error: dbError } = await adminSupabase
      .from("product_variants")
      .select(`
        id, 
        price_override,
        products (
          id, base_price, name, weight_grams,
          organizations (id, origin_district_id)
        )
      `)
      .in("id", variantIds);

    if (dbError || !dbVariants) throw new Error("Gagal memverifikasi produk.");

    const variantMap = new Map(dbVariants.map(v => [v.id, v]));
    const validatedItems: ValidatedItem[] = [];

    // 3. Reconstruct Items & APPLY FIX #5 (Weight Defaults)
    for (const item of items) {
      const dbVariant = variantMap.get(item.variant_id);
      if (!dbVariant) throw new Error(`Produk ID ${item.variant_id} tidak valid.`);

      const product = Array.isArray(dbVariant.products) ? dbVariant.products[0] : dbVariant.products;
      const org = Array.isArray(product.organizations) ? product.organizations[0] : product.organizations;

      if (org.id !== item.org_id) throw new Error("Inkonsistensi data toko.");
      if (!org.origin_district_id) throw new Error("Toko belum mengatur lokasi pengiriman.");

      // --- FIX #5 START: Server-Side Weight Default ---
      // We do NOT use item.weight from client. We use DB weight or default 1000g.
      const trustedWeight = product.weight_grams || 1000;
      // --- FIX #5 END ---

      validatedItems.push({
        cart_id: item.cart_id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        price: dbVariant.price_override ?? product.base_price,
        weight: trustedWeight, // Use Trusted Weight
        product_name: product.name,
        org_id: org.id,
        org_origin_id: org.origin_district_id.toString()
      });
    }

    // --- STEP 1: COUPON LOGIC ---
    
    const orgDiscountAllocation: Record<string, number> = {}; 
    let couponData: CouponData | null = null;

    if (couponId) {
      const { data, error } = await adminSupabase
        .from("coupons")
        .select("*")
        .eq("id", couponId)
        .single();
        
      if (error || !data) throw new Error("Kupon tidak valid.");
      couponData = data as CouponData;

      if (new Date(couponData.expires_at) < new Date()) {
        throw new Error("Kupon sudah kadaluarsa.");
      }

      let eligibleSubtotal = 0;
      validatedItems.forEach(item => {
        if (!couponData!.org_id || item.org_id === couponData!.org_id) {
          eligibleSubtotal += item.price * item.quantity;
        }
      });

      if (eligibleSubtotal < (couponData.min_purchase || 0)) {
        throw new Error(`Minimal belanja Rp ${couponData.min_purchase?.toLocaleString('id-ID')} tidak terpenuhi.`);
      }

      let totalDiscount = eligibleSubtotal * (couponData.discount_percent / 100);
      if (couponData.max_discount && totalDiscount > couponData.max_discount) {
        totalDiscount = couponData.max_discount;
      }
      
      if (couponData.org_id) {
        orgDiscountAllocation[couponData.org_id] = totalDiscount;
      } else {
        validatedItems.forEach(item => {
          const itemTotal = item.price * item.quantity;
          const share = itemTotal / eligibleSubtotal;
          const itemDiscount = totalDiscount * share;
          orgDiscountAllocation[item.org_id] = (orgDiscountAllocation[item.org_id] || 0) + itemDiscount;
        });
      }
    }

    // --- STEP 2: LOCK RESOURCES ---
    
    // A. Lock Stock
    for (const item of validatedItems) {
      const { error: stockError } = await adminSupabase.rpc("decrement_stock", {
        qty: item.quantity,
        variant_id: item.variant_id
      });
      if (stockError) throw new Error(`Stok habis untuk: ${item.product_name}`);
      lockedStock.push({ variant_id: item.variant_id, qty: item.quantity });
    }

    // B. Lock Coupon
    if (couponId) {
      const { error: couponError } = await adminSupabase.rpc("increment_coupon_usage", { coupon_id: couponId });
      if (couponError) throw new Error("Kupon tidak dapat digunakan (Limit habis).");
      couponLocked = true;
    }

    // --- STEP 3: ORDER CREATION ---
    
    let grandTotal = 0;
    const createdOrderIds: string[] = [];
    
    const groupedItems: Record<string, ValidatedItem[]> = {};
    validatedItems.forEach(item => {
      if (!groupedItems[item.org_id]) groupedItems[item.org_id] = [];
      groupedItems[item.org_id].push(item);
    });

    for (const orgId in groupedItems) {
      const orgItems = groupedItems[orgId];
      const clientShipping = shippingSelections[orgId];

      if (!clientShipping) throw new Error(`Pengiriman belum dipilih untuk toko ID: ${orgId}`);

      // Calculate Trusted Totals
      const productSubtotal = orgItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
      
      // Calculate Total Weight using TRUSTED weights
      const totalWeight = orgItems.reduce((sum, i) => sum + (i.weight * i.quantity), 0);
      const originId = orgItems[0].org_origin_id; 

      // Re-calculate Shipping Cost with Trusted Weight
      const shippingRes = await getShippingCost({
        origin: originId,
        destination: destinationId,
        weight: totalWeight,
        courier: clientShipping.courier
      });

      if (shippingRes.error || !shippingRes.results) {
        throw new Error(`Gagal menghitung ongkir ulang: ${shippingRes.error}`);
      }

      const validService = shippingRes.results.find(s => s.service === clientShipping.service);
      if (!validService) throw new Error(`Layanan pengiriman ${clientShipping.service} tidak tersedia.`);

      const trustedShippingCost = validService.cost[0].value;
      const allocatedDiscount = Math.floor(orgDiscountAllocation[orgId] || 0);

      const orderTotal = (productSubtotal + trustedShippingCost) - allocatedDiscount;
      const finalOrderTotal = Math.max(0, orderTotal);

      grandTotal += finalOrderTotal;

      // Insert Order
      const { data: order, error: orderError } = await adminSupabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          organization_id: orgId,
          shipping_address_id: addressId,
          courier_code: clientShipping.courier,
          courier_service: validService.service,
          shipping_cost: trustedShippingCost,
          weight_total: totalWeight, // FIX #5: Saving trusted weight to DB
          total_amount: finalOrderTotal,
          status: "pending",
          payment_group_id: paymentGroupId,
          delivery_method: "shipping",
          coupon_id: couponId 
        })
        .select("id")
        .single();

      if (orderError) throw new Error(`Database Error: ${orderError.message}`);
      createdOrderIds.push(order.id);

      // Insert Order Items
      const orderItemsPayload = orgItems.map(item => ({
        order_id: order.id,
        product_variant_id: item.variant_id,
        quantity: item.quantity,
        price_at_purchase: item.price
      }));

      const { error: itemsError } = await adminSupabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) throw new Error("Gagal menyimpan detail item.");
    }

    // --- STEP 4: PAYMENT GATEWAY ---

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single();
    
    const snapToken = await createSnapToken({
      orderId: paymentGroupId,
      grossAmount: Math.round(grandTotal), 
      customerDetails: {
        first_name: profile?.full_name || "Customer",
        email: profile?.email || user.email!,
        phone: profile?.phone || "0800000000",
      }
    });

    // --- STEP 5: FINALIZE ---

    await adminSupabase
      .from("orders")
      .update({ snap_token: snapToken })
      .in("id", createdOrderIds);

    await adminSupabase.from("carts").delete().in("id", validatedItems.map(i => i.cart_id));

    await adminSupabase.from("payments").insert({
      order_id: createdOrderIds[0], 
      amount: Math.round(grandTotal),
      snap_token: snapToken,
      payment_type: "midtrans_snap",
      transaction_status: "pending",
    });

    return { success: true, snapToken };

  } catch (error: any) {
    console.error("Checkout Failed, rolling back...", error);

    // Rollback
    if (lockedStock.length > 0) {
      for (const item of lockedStock) {
        await adminSupabase.rpc("restore_stock", {
          qty: item.qty,
          variant_id: item.variant_id
        });
      }
    }
    if (couponLocked && couponId) {
      await adminSupabase.rpc("restore_coupon_usage", { coupon_id: couponId });
    }

    return { error: error.message || "Terjadi kesalahan saat checkout." };
  }
}