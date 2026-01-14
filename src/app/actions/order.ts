// src/app/actions/order.ts
"use server";

import { createClient } from "@/utils/supabase/server";

export async function getUserOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    console.log("Debug: No user logged in"); // DEBUG LOG
    return [];
  }

  console.log("Debug: Fetching orders for User ID:", user.id); // DEBUG LOG

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
    console.error("Debug: Supabase Error:", error.message); // DEBUG LOG
    return [];
  }

  console.log("Debug: Found orders count:", data?.length); // DEBUG LOG
  return data || [];
}

export async function getOrderDetails(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      organization:organizations(name, slug, logo_url),
      shipping_address:user_addresses(*),
      items:order_items(
        id,
        quantity,
        price_at_purchase,
        variant:product_variants(
          name,
          product:products(
            id, 
            name,
            image_url, weight_grams
          )
        )
      )
    `)
    .eq("id", orderId)
    .eq("buyer_id", user.id) // Ensure users can only see their own orders
    .single();

  if (error) {
    console.error("Error fetching order details:", error.message);
    return null;
  }

  return data;
}