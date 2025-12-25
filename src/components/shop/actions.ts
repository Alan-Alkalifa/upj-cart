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
  // Karena stok di DB belum berkurang, kita harus hitung sendiri sisa jatah user.
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
    // Update Quantity
    const { error } = await supabase
      .from("carts")
      .update({ quantity: totalQtyRequested }) // Update jadi total baru
      .eq("id", existingItem.id)
    
    if (error) return { error: error.message }
  } else {
    // Insert Baru
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