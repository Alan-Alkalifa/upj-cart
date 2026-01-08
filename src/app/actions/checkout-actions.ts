"use server";

import { createClient } from "@/utils/supabase/server";
import { getShippingCost, CourierCode } from "@/lib/rajaongkir";
import { createSnapToken } from "@/lib/midtrans";
import { nanoid } from "nanoid";
import { redirect } from "next/navigation";

// --- TYPES ---
interface CheckoutItem {
  cart_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  weight: number;
  product_name: string;
  org_id: string;
  org_origin_id: string; // The merchant's location ID
}

interface ShippingSelection {
  [org_id: string]: {
    courier: CourierCode;
    service: string;
    cost: number;
  };
}

// --- ACTION: CALCULATE SHIPPING ---
// Called when user selects a courier in the dropdown
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
  userDistrictId: string // Needed to validate shipping didn't change
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. GENERATE PAYMENT GROUP ID
  // Midtrans needs a unique ID. Since one payment covers multiple orders, 
  // we use a specific prefix.
  const paymentGroupId = `PAY-${nanoid(10)}`;
  let grandTotal = 0;
  const createdOrderIds: string[] = [];

  // 2. GROUP ITEMS BY MERCHANT (ORGANIZATION)
  const groupedItems: Record<string, CheckoutItem[]> = {};
  items.forEach(item => {
    if (!groupedItems[item.org_id]) groupedItems[item.org_id] = [];
    groupedItems[item.org_id].push(item);
  });

  // 3. DATABASE TRANSACTION LOOP
  // We create one Order per Merchant
  for (const orgId in groupedItems) {
    const orgItems = groupedItems[orgId];
    const shipping = shippingSelections[orgId];

    if (!shipping) {
      return { error: `Pengiriman belum dipilih untuk salah satu toko.` };
    }

    // Calculate Subtotals
    const productSubtotal = orgItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalWeight = orgItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const orderTotal = productSubtotal + shipping.cost;

    grandTotal += orderTotal;

    // A. Create Order Record
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        buyer_id: user.id,
        shipping_address_id: addressId,
        courier_code: shipping.courier,
        courier_service: shipping.service,
        shipping_cost: shipping.cost,
        weight_total: totalWeight,
        total_amount: orderTotal,
        status: "pending",
        payment_group_id: paymentGroupId,
        // Optional: snapshot fields if you added them to schema
      })
      .select("id")
      .single();

    if (orderError) {
        console.error("Order Create Error:", orderError);
        return { error: "Gagal membuat pesanan." };
    }

    createdOrderIds.push(order.id);

    // B. Create Order Items
    const orderItemsPayload = orgItems.map(item => ({
      order_id: order.id,
      product_variant_id: item.variant_id,
      quantity: item.quantity,
      price_at_purchase: item.price
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
    if (itemsError) return { error: "Gagal menyimpan detail produk." };
  }

  // 4. GENERATE MIDTRANS TOKEN
  // We use the 'profiles' table to get customer info for Midtrans
  const { data: profile } = await supabase.from("profiles").select("full_name, email, phone").eq("id", user.id).single();
  
  const snapToken = await createSnapToken({
    orderId: paymentGroupId,
    grossAmount: grandTotal,
    customerDetails: {
      first_name: profile?.full_name || "Customer",
      email: profile?.email || user.email!,
      phone: profile?.phone || "0800000000",
    }
  });

  // 5. UPDATE ORDERS WITH TOKEN & CLEAN CART
  // Save the token to all orders in this group so we can resume payment if needed
  await supabase.from("orders").update({ snap_token: snapToken }).in("id", createdOrderIds);

  // Remove items from cart
  const cartIdsToRemove = items.map(i => i.cart_id);
  await supabase.from("cart_items").delete().in("id", cartIdsToRemove);

  // 6. CREATE INITIAL PAYMENT LOG
  await supabase.from("payments").insert({
    order_id: createdOrderIds[0], // We link it to the first order for reference, or handle better in DB
    amount: grandTotal,
    snap_token: snapToken,
    payment_type: "midtrans_snap",
    transaction_status: "pending",
    // midtrans_transaction_id will be updated via Webhook later
  });

  return { success: true, snapToken };
}