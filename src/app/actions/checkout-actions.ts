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

// --- ACTION: PROCESS CHECKOUT ---
export async function processCheckout(
  items: CheckoutItem[],
  addressId: string,
  shippingSelections: ShippingSelection,
  userDistrictId: string,
  couponId: string | null // UPDATE: Menerima couponId
) {
  // 1. Validasi User (Pakai Client biasa)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 2. Gunakan ADMIN Client (Bypass RLS)
  const adminSupabase = createAdminClient();

  // --- LOGIC BARU: Kunci Stok & Kupon ---
  
  // A. Lock Product Stock (Decrement)
  for (const item of items) {
    const { error: stockError } = await adminSupabase.rpc("decrement_stock", {
      qty: item.quantity,
      variant_id: item.variant_id
    });
    
    if (stockError) {
      console.error("Stock Lock Error:", stockError);
      return { error: `Stok tidak mencukupi untuk produk: ${item.product_name}` };
    }
  }

  // B. Lock Coupon Usage (Increment)
  if (couponId) {
    const { error: couponError } = await adminSupabase.rpc("increment_coupon_usage", {
      coupon_id: couponId
    });

    if (couponError) {
      console.error("Coupon Lock Error:", couponError);
      return { error: "Gagal menggunakan kupon (Limit tercapai atau kadaluarsa)." };
    }
  }
  // --- END LOGIC BARU ---

  const paymentGroupId = `PAY-${nanoid(10)}`;
  let grandTotal = 0;
  const createdOrderIds: string[] = [];

  // 3. Group Items by Merchant
  const groupedItems: Record<string, CheckoutItem[]> = {};
  items.forEach(item => {
    if (!groupedItems[item.org_id]) groupedItems[item.org_id] = [];
    groupedItems[item.org_id].push(item);
  });

  // 4. Proses Loop Order per Merchant
  for (const orgId in groupedItems) {
    const orgItems = groupedItems[orgId];
    const shipping = shippingSelections[orgId];

    if (!shipping) {
      return { error: `Pengiriman belum dipilih untuk salah satu toko.` };
    }

    const productSubtotal = orgItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalWeight = orgItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const orderTotal = productSubtotal + shipping.cost;

    grandTotal += orderTotal;

    // A. Create Order Record
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
        coupon_id: couponId // UPDATE: Simpan ID Kupon (pastikan kolom sudah dibuat via SQL)
      })
      .select("id")
      .single();

    if (orderError) {
        console.error("Order Create Error:", orderError);
        return { error: `Gagal membuat pesanan: ${orderError.message}` };
    }

    createdOrderIds.push(order.id);

    // B. Create Order Items
    const orderItemsPayload = orgItems.map(item => ({
      order_id: order.id,
      product_variant_id: item.variant_id,
      quantity: item.quantity,
      price_at_purchase: item.price
    }));

    const { error: itemsError } = await adminSupabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsError) {
      console.error("Order Items Error:", itemsError);
      return { error: "Gagal menyimpan detail produk." };
    }
  }

  // 5. Generate Midtrans Token
  const { data: profile } = await adminSupabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();
  
  const snapToken = await createSnapToken({
    orderId: paymentGroupId,
    grossAmount: grandTotal,
    customerDetails: {
      first_name: profile?.full_name || "Customer",
      email: profile?.email || user.email!,
      phone: profile?.phone || "0800000000",
    }
  });

  // 6. Update Token ke Semua Order
  await adminSupabase
    .from("orders")
    .update({ snap_token: snapToken })
    .in("id", createdOrderIds);

  // 7. Bersihkan Cart
  const cartIdsToRemove = items.map(i => i.cart_id);
  const { error: deleteCartError } = await adminSupabase
    .from("carts") 
    .delete()
    .in("id", cartIdsToRemove);

  if (deleteCartError) {
    console.error("Warning: Gagal hapus cart", deleteCartError);
  }

  // 8. Create Payment Log
  await adminSupabase.from("payments").insert({
    order_id: createdOrderIds[0], 
    amount: grandTotal,
    snap_token: snapToken,
    payment_type: "midtrans_snap",
    transaction_status: "pending",
  });

  return { success: true, snapToken };
}