// src/app/actions/order.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { getPlatformSettings } from "@/utils/get-settings";

// --- FETCH USER ORDERS ---
export async function getUserOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // Fetch orders with nested relations:
  // Order -> Organization (Store Name)
  // Order -> Order Items -> Product Variant -> Product (Image, Name)
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      organization:organizations(name, slug, logo_url),
      items:order_items(
        id,
        quantity,
        price_at_purchase,
        variant:product_variants(
          name,
          product:products(
            name,
            image_url,
            slug
          )
        )
      )
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching orders:", error);
    return [];
  }

  return data || [];
}

// --- PAYMENT PROCESSING LOGIC (Server-Side) ---
export async function processOrderPayment(orderId: string, orderTotal: number) {
  const supabase = await createClient();
  
  // 1. Ambil Settings (Fee %)
  const settings = await getPlatformSettings();
  
  // 2. Hitung Potongan
  const feePercent = Number(settings.transaction_fee_percent) || 0;
  const adminFeeAmount = Math.round(orderTotal * (feePercent / 100));
  const merchantNetAmount = orderTotal - adminFeeAmount;

  // 3. Update Database (Example logic)
  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
    })
    .eq("id", orderId);
    
  if (error) console.error("Failed to update order payment status", error);
}