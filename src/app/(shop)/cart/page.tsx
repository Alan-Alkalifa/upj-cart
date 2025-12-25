import { createClient } from "@/utils/supabase/server"
import { CartPageClient } from "@/components/shop/cart-page-client"
import { redirect } from "next/navigation"

export default async function CartPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Fetch Cart Items
  const { data: cartItems } = await supabase
    .from("carts")
    .select(`
      id, quantity,
      product_variants (
        id, name, price_override, stock,
        products (
          id, name, base_price, image_url,
          organizations (id, name, slug)
        )
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  return <CartPageClient cartItems={cartItems || []} />
}