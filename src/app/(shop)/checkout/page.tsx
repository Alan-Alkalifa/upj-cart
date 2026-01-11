import { createClient } from "@/utils/supabase/server"
import { CheckoutClient } from "./checkout-client"
import { redirect } from "next/navigation"

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string; coupon?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const params = await searchParams
  const itemIds = params.items?.split(",") || []

  if (itemIds.length === 0) {
    redirect("/cart")
  }

  // 1. Fetch Selected Cart Items
  // FIXED: Added 'stock' to the selection to perform availability checks
  const { data: cartItems } = await supabase
    .from("carts")
    .select(`
      id, quantity,
      product_variants (
        id, name, price_override, stock,
        products (
          id, name, weight_grams, image_url,
          organizations (id, name, origin_district_id)
        )
      )
    `)
    .in("id", itemIds)
    .eq("user_id", user.id)

  if (!cartItems || cartItems.length === 0) {
    redirect("/cart")
  }

  // --- FIX START: Pre-Check Stock Availability ---
  // Validate that all selected items are actually in stock before rendering checkout
  const outOfStockItems = cartItems.filter((item: any) => {
    // Unwrap variant (handle potential array/object structure from Supabase)
    const variant = Array.isArray(item.product_variants) 
      ? item.product_variants[0] 
      : item.product_variants;
      
    // If variant doesn't exist or requested quantity exceeds stock
    if (!variant) return true; 
    return item.quantity > variant.stock;
  });

  if (outOfStockItems.length > 0) {
    // Redirect back to cart. 
    // The Cart page generally handles 'error' params to show a toast (e.g., "Stok berubah")
    redirect("/cart?error=stock_limit_reached")
  }
  // --- FIX END ---

  // 2. Fetch User Addresses
  const { data: addresses } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false })

  // 3. (Optional) Fetch Coupon if provided
  let couponData = null
  if (params.coupon) {
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", params.coupon)
      .gt("expires_at", new Date().toISOString())
      .single()
    
    // Only pass coupon data if it's found and valid
    if (data) {
       couponData = data
    }
  }

  return (
    <CheckoutClient 
      cartItems={cartItems || []} 
      addresses={addresses || []}
      coupon={couponData}
    />
  )
}