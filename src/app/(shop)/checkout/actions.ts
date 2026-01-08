"use server";

import { createClient } from "@/utils/supabase/server";
import { getShippingCost, CourierCode } from "@/lib/rajaongkir";
import { createSnapToken } from "@/lib/midtrans";
import { nanoid } from "nanoid";

// --- TYPES ---
export interface CheckoutItem {
  cart_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  weight: number;
  product_name: string;
  org_id: string;
  org_origin_id: string; // The merchant's location ID (origin_district_id)
}

export interface ShippingSelection {
  [org_id: string]: {
    courier: CourierCode;
    service: string;
    cost: number;
    etd?: string;
  };
}

// --- ACTION 1: CALCULATE SHIPPING ---
// This is called by the UI when the user selects a courier (JNE/POS/TIKI)
export async function calculateShippingAction(
  origin: string, 
  destination: string, 
  weight: number, 
  courier: CourierCode
) {
  if (!origin || !destination || weight <= 0) {
    return { error: "Data pengiriman tidak lengkap" };
  }

  // Call the RajaOngkir utility we created in Phase 2
  const result = await getShippingCost({ origin, destination, weight, courier });
  return result;
}

// --- ACTION 2: PROCESS CHECKOUT ---
// This is called when the user clicks "Pay Now"
export async function processCheckout(
  items: CheckoutItem[],
  addressId: string,
  shippingSelections: ShippingSelection,
  userDistrictId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. GENERATE PAYMENT GROUP ID
  // Midtrans requires a unique Order ID. Since 1 Payment = Multiple Store Orders,
  // we create a 'Group ID' to act as the primary Transaction ID.
  const paymentGroupId = `PAY-${nanoid(10)}`;
  
  let grandTotal = 0;
  const createdOrderIds: string[] = [];
  const itemsToRemove: string[] = [];

  // 2. GROUP ITEMS BY MERCHANT
  const groupedItems: Record<string, CheckoutItem[]> = {};
  items.forEach(item => {
    if (!groupedItems[item.org_id]) groupedItems[item.org_id] = [];
    groupedItems[item.org_id].push(item);
    itemsToRemove.push(item.cart_id);
  });

  // 3. CREATE ORDERS (Database Transaction)
  for (const orgId in groupedItems) {
    const orgItems = groupedItems[orgId];
    const shipping = shippingSelections[orgId];

    if (!shipping) {
      return { error: `Pengiriman belum dipilih untuk salah satu toko.` };
    }

    // Calculate Store Totals
    const productSubtotal = orgItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalWeight = orgItems.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    const orderTotal = productSubtotal + shipping.cost;

    grandTotal += orderTotal;

    // A. Insert Order Record
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
        status: "pending", // Default status
        payment_group_id: paymentGroupId, // Links this order to the Midtrans transaction
      })
      .select("id")
      .single();

    if (orderError) {
        console.error("Order Create Error:", orderError);
        return { error: "Gagal membuat pesanan." };
    }

    createdOrderIds.push(order.id);

    // B. Insert Order Items
    const orderItemsPayload = orgItems.map(item => ({
      order_id: order.id,
      product_variant_id: item.variant_id,
      quantity: item.quantity,
      price_at_purchase: item.price
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
    if (itemsError) return { error: "Gagal menyimpan detail produk." };
  }

  // 4. FETCH USER PROFILE (For Midtrans Customer Details)
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  // 5. GENERATE MIDTRANS SNAP TOKEN
  // We use the utility from Phase 2
  try {
    const snapToken = await createSnapToken({
      orderId: paymentGroupId, // Use the Group ID here
      grossAmount: grandTotal,
      customerDetails: {
        first_name: profile?.full_name || "Customer",
        email: profile?.email || user.email!,
        phone: profile?.phone || "0800000000",
      }
    });

    if (!snapToken) throw new Error("Empty token received");

    // 6. UPDATE ORDERS WITH TOKEN
    // Saving the token allows the user to "Repay" later if they close the popup
    await supabase
      .from("orders")
      .update({ snap_token: snapToken })
      .in("id", createdOrderIds);

    // 7. LOG PAYMENT TRANSACTION
    await supabase.from("payments").insert({
      order_id: createdOrderIds[0], // We link to the first order for reference
      amount: grandTotal,
      snap_token: snapToken,
      payment_type: "midtrans_snap",
      transaction_status: "pending",
    });

    // 8. CLEANUP CART
    // Only delete items that were successfully turned into orders
    if (itemsToRemove.length > 0) {
      await supabase.from("cart_items").delete().in("id", itemsToRemove);
    }

    return { success: true, snapToken };

  } catch (err) {
    console.error("Payment Gateway Error:", err);
    return { error: "Gagal menghubungkan ke gateway pembayaran." };
  }
}