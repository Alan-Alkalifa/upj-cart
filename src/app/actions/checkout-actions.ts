"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; 
import { getShippingCost, CourierCode } from "@/lib/rajaongkir";
import { createSnapToken } from "@/lib/midtrans";
import { nanoid } from "nanoid";

// --- TYPES ---
interface CheckoutItem {
  cart_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  weight: number;
  product_name: string;
  org_id: string;
  org_origin_id: string;
}

interface ShippingSelection {
  [org_id: string]: {
    courier: CourierCode;
    service: string;
    cost: number;
  };
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
export async function processCheckout(
  items: CheckoutItem[],
  addressId: string,
  shippingSelections: ShippingSelection,
  userDistrictId: string,
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
    // --- STEP 1: LOCK RESOURCES ---
    
    // A. Lock Product Stock
    for (const item of items) {
      const { error: stockError } = await adminSupabase.rpc("decrement_stock", {
        qty: item.quantity,
        variant_id: item.variant_id
      });
      
      if (stockError) {
        throw new Error(`Stok tidak mencukupi untuk produk: ${item.product_name}`);
      }
      // Track successful lock for potential rollback
      lockedStock.push({ variant_id: item.variant_id, qty: item.quantity });
    }

    // B. Lock Coupon Usage
    if (couponId) {
      const { error: couponError } = await adminSupabase.rpc("increment_coupon_usage", {
        coupon_id: couponId
      });

      if (couponError) {
        throw new Error("Gagal menggunakan kupon (Limit tercapai atau kadaluarsa).");
      }
      couponLocked = true;
    }

    // --- STEP 2: CREATE ORDERS ---
    
    let grandTotal = 0;
    const createdOrderIds: string[] = [];
    const groupedItems: Record<string, CheckoutItem[]> = {};

    items.forEach(item => {
      if (!groupedItems[item.org_id]) groupedItems[item.org_id] = [];
      groupedItems[item.org_id].push(item);
    });

    for (const orgId in groupedItems) {
      const orgItems = groupedItems[orgId];
      const shipping = shippingSelections[orgId];

      if (!shipping) throw new Error(`Pengiriman belum dipilih untuk toko ID: ${orgId}`);

      const productSubtotal = orgItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const orderTotal = productSubtotal + shipping.cost;
      const totalWeight = orgItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);

      grandTotal += orderTotal;

      // Create Order
      const { data: order, error: orderError } = await adminSupabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          organization_id: orgId,
          shipping_address_id: addressId,
          courier_code: shipping.courier,
          courier_service: shipping.service,
          shipping_cost: shipping.cost,
          weight_total: totalWeight,
          total_amount: orderTotal,
          status: "pending",
          payment_group_id: paymentGroupId,
          delivery_method: "shipping",
          coupon_id: couponId 
        })
        .select("id")
        .single();

      if (orderError) throw new Error(`Database Error: ${orderError.message}`);

      createdOrderIds.push(order.id);

      // Create Order Items
      const orderItemsPayload = orgItems.map(item => ({
        order_id: order.id,
        product_variant_id: item.variant_id,
        quantity: item.quantity,
        price_at_purchase: item.price
      }));

      const { error: itemsError } = await adminSupabase
        .from("order_items")
        .insert(orderItemsPayload);

      if (itemsError) throw new Error(`Item Save Error: ${itemsError.message}`);
    }

    // --- STEP 3: MIDTRANS INTEGRATION ---

    const { data: profile } = await adminSupabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("id", user.id)
      .single();
    
    // This call is risky (External API)
    const snapToken = await createSnapToken({
      orderId: paymentGroupId,
      grossAmount: grandTotal,
      customerDetails: {
        first_name: profile?.full_name || "Customer",
        email: profile?.email || user.email!,
        phone: profile?.phone || "0800000000",
      }
    });

    // --- STEP 4: FINALIZE ---

    // Update Token
    await adminSupabase
      .from("orders")
      .update({ snap_token: snapToken })
      .in("id", createdOrderIds);

    // Clear Cart
    const cartIdsToRemove = items.map(i => i.cart_id);
    await adminSupabase.from("carts").delete().in("id", cartIdsToRemove);

    // Create Payment Log
    await adminSupabase.from("payments").insert({
      order_id: createdOrderIds[0], 
      amount: grandTotal,
      snap_token: snapToken,
      payment_type: "midtrans_snap",
      transaction_status: "pending",
    });

    return { success: true, snapToken };

  } catch (error: any) {
    console.error("Checkout Failed, performing rollback...", error);

    // --- COMPENSATION LOGIC (ROLLBACK) ---
    
    // 1. Rollback Stock
    if (lockedStock.length > 0) {
      for (const item of lockedStock) {
        await adminSupabase.rpc("restore_stock", {
          qty: item.qty,
          variant_id: item.variant_id
        });
      }
    }

    // 2. Rollback Coupon
    if (couponLocked && couponId) {
      await adminSupabase.rpc("restore_coupon_usage", {
        coupon_id: couponId
      });
    }

    return { error: error.message || "Terjadi kesalahan saat checkout." };
  }
}