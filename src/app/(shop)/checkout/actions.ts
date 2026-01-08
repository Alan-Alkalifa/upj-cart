"use server";

import { createClient } from "@/utils/supabase/server";
import { getShippingCost, getProvinces, getCities, getSubdistricts, CourierCode } from "@/lib/rajaongkir";
import { createSnapToken } from "@/lib/midtrans";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

// --- TYPES ---
export interface CheckoutItem {
  cart_id: string;
  variant_id: string;
  quantity: number;
  price: number;
  weight: number;
  product_name: string;
  org_id: string;
  org_origin_id: string; 
}

export interface ShippingSelection {
  [org_id: string]: {
    courier: CourierCode;
    service: string;
    cost: number;
    etd?: string;
  };
}

// --- ACTION: LOCATION DATA ---
export async function getLocationData(type: 'province' | 'city' | 'subdistrict', parentId?: string) {
  if (type === 'province') return await getProvinces();
  if (type === 'city' && parentId) return await getCities(parentId);
  if (type === 'subdistrict' && parentId) return await getSubdistricts(parentId);
  return [];
}

// --- ACTION: ADD ADDRESS ---
export async function addUserAddressAction(data: {
  label: string;
  recipient_name: string;
  phone: string;
  street_address: string;
  province_id: string;
  province_name: string;
  city_id: string;
  city_name: string;
  district_id: string; // subdistrict_id
  district_name: string;
  postal_code: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase.from("user_addresses").insert({
    user_id: user.id,
    label: data.label,
    recipient_name: data.recipient_name,
    phone: data.phone,
    street_address: data.street_address,
    province_id: data.province_id,
    province_name: data.province_name,
    city_id: data.city_id,
    city_name: data.city_name,
    district_id: data.district_id, // Mapping subdistrict ke district_id (sesuai schema)
    district_name: data.district_name,
    postal_code: data.postal_code,
    city: data.city_name // Fallback field
  });

  if (error) {
    console.error("Add Address Error:", error);
    return { error: "Gagal menyimpan alamat." };
  }

  revalidatePath("/checkout");
  return { success: true };
}

// --- ACTION 1: CALCULATE SHIPPING ---
export async function calculateShippingAction(
  origin: string, 
  destination: string, 
  weight: number, 
  courier: CourierCode
) {
  if (!origin || !destination || weight <= 0) {
    return { error: "Data pengiriman tidak lengkap" };
  }

  const result = await getShippingCost({ origin, destination, weight, courier });
  return result;
}

// --- ACTION 2: PROCESS CHECKOUT ---
export async function processCheckout(
  items: CheckoutItem[],
  addressId: string,
  shippingSelections: ShippingSelection,
  userDistrictId: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const paymentGroupId = `PAY-${nanoid(10)}`;
  
  let grandTotal = 0;
  const createdOrderIds: string[] = [];
  const itemsToRemove: string[] = [];

  const groupedItems: Record<string, CheckoutItem[]> = {};
  items.forEach(item => {
    if (!groupedItems[item.org_id]) groupedItems[item.org_id] = [];
    groupedItems[item.org_id].push(item);
    itemsToRemove.push(item.cart_id);
  });

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
      })
      .select("id")
      .single();

    if (orderError) {
        console.error("Order Create Error:", orderError);
        return { error: "Gagal membuat pesanan." };
    }

    createdOrderIds.push(order.id);

    const orderItemsPayload = orgItems.map(item => ({
      order_id: order.id,
      product_variant_id: item.variant_id,
      quantity: item.quantity,
      price_at_purchase: item.price
    }));

    const { error: itemsError } = await supabase.from("order_items").insert(orderItemsPayload);
    if (itemsError) return { error: "Gagal menyimpan detail produk." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  try {
    const snapToken = await createSnapToken({
      orderId: paymentGroupId,
      grossAmount: grandTotal,
      customerDetails: {
        first_name: profile?.full_name || "Customer",
        email: profile?.email || user.email!,
        phone: profile?.phone || "0800000000",
      }
    });

    if (!snapToken) throw new Error("Empty token received");

    await supabase
      .from("orders")
      .update({ snap_token: snapToken })
      .in("id", createdOrderIds);

    await supabase.from("payments").insert({
      order_id: createdOrderIds[0],
      amount: grandTotal,
      snap_token: snapToken,
      payment_type: "midtrans_snap",
      transaction_status: "pending",
    });

    if (itemsToRemove.length > 0) {
      await supabase.from("cart_items").delete().in("id", itemsToRemove);
    }

    return { success: true, snapToken };

  } catch (err) {
    console.error("Payment Gateway Error:", err);
    return { error: "Gagal menghubungkan ke gateway pembayaran." };
  }
}