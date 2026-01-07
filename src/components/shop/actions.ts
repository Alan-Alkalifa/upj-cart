"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function addToCart(variantId: string, quantity: number) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // 1. Ambil Data Stok Varian Terbaru
  const { data: variant } = await supabase
    .from("product_variants")
    .select("stock, name, products(name)")
    .eq("id", variantId)
    .single()

  if (!variant) return { error: "Produk tidak ditemukan" }

  // 2. Cek Apakah Item Sudah Ada di Cart User
  const { data: existingItem } = await supabase
    .from("carts")
    .select("id, quantity")
    .eq("user_id", user.id)
    .eq("product_variant_id", variantId)
    .maybeSingle()

  const currentCartQty = existingItem?.quantity || 0
  const totalQtyRequested = currentCartQty + quantity

  // 3. VALIDASI KETAT: Cek Total (Cart Lama + Baru) vs Stok
  if (totalQtyRequested > variant.stock) {
    const availableToAdd = variant.stock - currentCartQty
    
    if (availableToAdd <= 0) {
      return { error: `Stok habis! Anda sudah memiliki ${currentCartQty} unit di keranjang (Maks: ${variant.stock}).` }
    } else {
      return { error: `Stok tidak cukup. Anda sudah punya ${currentCartQty} di keranjang. Hanya bisa tambah ${availableToAdd} lagi.` }
    }
  }

  // 4. Proses Insert/Update
  if (existingItem) {
    const { error } = await supabase
      .from("carts")
      .update({ quantity: totalQtyRequested })
      .eq("id", existingItem.id)
    
    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from("carts")
      .insert({
        user_id: user.id,
        product_variant_id: variantId,
        quantity: quantity
      })
    
    if (error) return { error: error.message }
  }

  revalidatePath("/cart")
  revalidatePath("/") 
  return { success: true }
}

export async function removeCartItem(itemId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from("carts")
    .delete()
    .eq("id", itemId)
    
  if (error) return { error: error.message }
  
  revalidatePath("/cart")
  return { success: true }
}

// --- NEW FUNCTION: Update Quantity ---
export async function updateCartItemQuantity(itemId: string, newQuantity: number) {
  const supabase = await createClient()

  // 1. Ambil item cart untuk tahu varian ID-nya
  const { data: item } = await supabase
    .from("carts")
    .select("product_variant_id")
    .eq("id", itemId)
    .single()
    
  if (!item) return { error: "Item tidak ditemukan" }

  // 2. Cek Stok Real-time
  const { data: variant } = await supabase
    .from("product_variants")
    .select("stock")
    .eq("id", item.product_variant_id)
    .single()

  if (!variant) return { error: "Varian tidak ditemukan" }

  // 3. Validasi Logic
  if (newQuantity < 1) {
    return { error: "Jumlah minimal 1" }
  }

  if (newQuantity > variant.stock) {
    return { error: `Stok hanya tersisa ${variant.stock}` }
  }

  // 4. Update Database
  const { error } = await supabase
    .from("carts")
    .update({ quantity: newQuantity })
    .eq("id", itemId)

  if (error) return { error: error.message }

  revalidatePath("/cart")
  return { success: true }
}

export async function validateCoupon(code: string, selectedCartItemIds: string[]) {
  const supabase = await createClient()

  // 1. Get Coupon
  const { data: coupon, error: couponError } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", code)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (couponError || !coupon) {
    return { error: "Kupon tidak ditemukan atau sudah kadaluarsa." }
  }

  if (coupon.max_uses !== -1 && coupon.times_used >= coupon.max_uses) {
    return { error: "Kuota penggunaan kupon ini sudah habis." }
  }

  // 2. Get Selected Cart Items with Organization Info
  // We need to check if ANY of the selected items belong to the coupon's org.
  const { data: cartItems } = await supabase
    .from("carts")
    .select(`
      id,
      product_variants (
        products (
          org_id
        )
      )
    `)
    .in("id", selectedCartItemIds)

  if (!cartItems || cartItems.length === 0) {
    return { error: "Tidak ada produk yang dipilih." }
  }

  // 3. Validate Organization Match
  // "tidak bisa menggunakan coupon dari organisasi lain"
  // We check if AT LEAST ONE selected item belongs to the coupon's org.
  // And strictly, we might warn if mixed? No, just apply to valid ones.
  // BUT the prompt might imply a strict check: "Only allow if valid for current products".
  
  const validItems = cartItems.filter((item: any) => 
    item.product_variants?.products?.org_id === coupon.org_id
  )

  if (validItems.length === 0) {
    return { error: "Kupon ini tidak berlaku untuk toko dari produk yang Anda pilih." }
  }

  // If we want to restrict mixing (e.g. can't use coupon A if cart has B), we'd check here.
  // But standard flow is: Apply discount to valid items.
  
  return { 
    success: true, 
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discount_percent: coupon.discount_percent,
      org_id: coupon.org_id
    }
  }
}