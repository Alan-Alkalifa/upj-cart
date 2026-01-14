// src/app/actions/order.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { getPlatformSettings } from "@/utils/get-settings";

// --- FETCH USER ORDERS ---
export async function getUserOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  // FIX: 
  // 1. Removed 'slug' from products (it does not exist in your DB schema).
  // 2. Added 'id' to products (needed for links in OrderCard).
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
            id, 
            name,
            image_url
          )
        )
      )
    `)
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    // Check your terminal for this error if orders still don't show!
    console.error("Error fetching orders:", error.message);
    return [];
  }

  return data || [];
}

// --- PAYMENT PROCESSING LOGIC ---
export async function processOrderPayment(orderId: string, orderTotal: number) {
  const supabase = await createClient();
  
  // 1. Get Settings (for Fee calculation if needed later)
  const settings = await getPlatformSettings();
  
  // 2. Update Database to PAID
  const { error } = await supabase
    .from("orders")
    .update({ status: "paid" })
    .eq("id", orderId)
    .in("status", ["pending"]); // Prevent overwriting if already paid/cancelled
    
  if (error) console.error("Failed to update order payment status", error);
}