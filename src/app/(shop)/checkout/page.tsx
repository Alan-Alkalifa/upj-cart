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
  // FIXED: Removed 'weight_grams' from product_variants as it is not in the type definition.
  const { data: cartItems } = await supabase
    .from("carts")
    .select(`
      id, quantity,
      product_variants (
        id, name, price_override,
        products (
          id, name, weight_grams, image_url,
          organizations (id, name, origin_district_id)
        )
      )
    `)
    .in("id", itemIds)
    .eq("user_id", user.id)

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
    couponData = data
  }

  return (
    <CheckoutClient 
      cartItems={cartItems || []} 
      addresses={addresses || []}
      coupon={couponData}
    />
  )
}