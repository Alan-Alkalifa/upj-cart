// src/app/actions/order.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export async function getUserOrders() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

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
    console.error("Error fetching orders:", error.message);
    return [];
  }

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
            image_url, 
            weight_grams
          )
        )
      ),
      reviews(*)
    `)
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .single();

  if (error) {
    console.error("Error fetching order details:", error.message);
    return null;
  }

  return data;
}

export async function completeOrder(orderId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized" };
  }

  // Verify ownership and status
  const { data: order } = await supabase
    .from("orders")
    .select("status, buyer_id")
    .eq("id", orderId)
    .single();

  if (!order || order.buyer_id !== user.id) {
    return { error: "Pesanan tidak ditemukan atau akses ditolak." };
  }

  if (order.status !== "shipped") {
    return { error: "Pesanan belum dikirim atau status tidak valid." };
  }

  const { error } = await supabase
    .from("orders")
    .update({ status: "completed" })
    .eq("id", orderId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  return { success: true };
}

type ReviewInput = {
  productId: string;
  rating: number;
  comment: string;
};

export async function submitOrderReviews(orderId: string, reviews: ReviewInput[]) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // simple validation
  if (!reviews.length) return { error: "Tidak ada ulasan yang dikirim." };

  // Construct insert data
  const payload = reviews.map((r) => ({
    buyer_id: user.id,
    order_id: orderId,
    product_id: r.productId,
    rating: r.rating,
    comment: r.comment,
  }));

  const { error } = await supabase.from("reviews").insert(payload);

  if (error) {
    console.error("Error submitting reviews:", error);
    return { error: "Gagal menyimpan ulasan. Silakan coba lagi." };
  }

  revalidatePath(`/orders/${orderId}`);
  return { success: true };
}