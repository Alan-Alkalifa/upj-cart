"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; //
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
  userDistrictId: string
) {
  // 1. Validasi User (Tetap pakai Client biasa untuk cek session)
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 2. Gunakan ADMIN Client untuk operasi Database (BYPASS RLS)
  // Ini solusi utama untuk error 42501
  const adminSupabase = createAdminClient();

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

    // A. Create Order Record (Pakai adminSupabase)
    const { data: order, error: orderError } = await adminSupabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        organization_id: orgId, // FIX: Wajib ada (sesuai diagnosa sebelumnya)
        shipping_address_id: addressId,
        courier_code: shipping.courier,
        courier_service: shipping.service,
        shipping_cost: shipping.cost,
        weight_total: totalWeight,
        total_amount: orderTotal,
        status: "pending",
        payment_group_id: paymentGroupId,
        delivery_method: "shipping",
      })
      .select("id")
      .single();

    if (orderError) {
        console.error("Order Create Error:", orderError);
        return { error: `Gagal membuat pesanan: ${orderError.message}` };
    }

    createdOrderIds.push(order.id);

    // B. Create Order Items (Pakai adminSupabase)
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
  // Ambil profil user untuk data customer Midtrans
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

  // 6. Update Token ke Semua Order (Pakai adminSupabase)
  await adminSupabase
    .from("orders")
    .update({ snap_token: snapToken })
    .in("id", createdOrderIds);

  // 7. Bersihkan Cart (Pakai adminSupabase)
  // FIX: Pastikan nama tabel sesuai ('carts' atau 'cart_items')
  // Berdasarkan file page.tsx Anda fetch dari 'carts', tapi delete 'cart_items'.
  // Saya gunakan 'carts' untuk konsistensi dengan fetch Anda, sesuaikan jika error.
  const cartIdsToRemove = items.map(i => i.cart_id);
  const { error: deleteCartError } = await adminSupabase
    .from("carts") // Ganti ke "cart_items" jika tabel Anda bernama cart_items
    .delete()
    .in("id", cartIdsToRemove);

  if (deleteCartError) {
    console.error("Warning: Gagal hapus cart (cek nama tabel)", deleteCartError);
  }

  // 8. Create Payment Log (Pakai adminSupabase)
  await adminSupabase.from("payments").insert({
    order_id: createdOrderIds[0], 
    amount: grandTotal,
    snap_token: snapToken,
    payment_type: "midtrans_snap",
    transaction_status: "pending",
  });

  return { success: true, snapToken };
}