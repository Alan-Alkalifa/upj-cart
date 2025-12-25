"use server"

import { createClient } from "@/utils/supabase/server"
import { productSchema } from "@/lib/dashboard-schemas"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

// --- CREATE PRODUCT ---
export async function createProduct(orgId: string, values: z.infer<typeof productSchema>) {
  const supabase = await createClient()
  
  // 1. Insert Product
  const { data: product, error: prodError } = await supabase
    .from("products")
    .insert({
      org_id: orgId,
      global_category_id: values.global_category_id,
      name: values.name,
      description: values.description,
      base_price: values.base_price,
      weight_grams: values.weight_grams,
      image_url: values.image_url,
      is_active: values.is_active
    })
    .select()
    .single()

  if (prodError) return { error: prodError.message }

  // 2. Insert Variants
  if (values.variants.length > 0) {
    const variantsData = values.variants.map(v => ({
      product_id: product.id,
      name: v.name,
      stock: v.stock,
      price_override: v.price_override || values.base_price
    }))

    const { error: varError } = await supabase
      .from("product_variants")
      .insert(variantsData)

    if (varError) return { error: "Produk dibuat, tapi gagal simpan varian: " + varError.message }
  }

  revalidatePath("/dashboard/products")
  return { success: true }
}

// --- UPDATE PRODUCT ---
export async function updateProduct(productId: string, values: z.infer<typeof productSchema>) {
  const supabase = await createClient()

  // 1. Update Product Details
  const { error: prodError } = await supabase
    .from("products")
    .update({
      global_category_id: values.global_category_id,
      name: values.name,
      description: values.description,
      base_price: values.base_price,
      weight_grams: values.weight_grams,
      image_url: values.image_url,
      is_active: values.is_active,
      updated_at: new Date().toISOString()
    })
    .eq("id", productId)

  if (prodError) return { error: prodError.message }

  // 2. Upsert Variants (Handle Add/Update)
  // Note: Handling deletion of variants removed from UI requires more logic (fetching existing IDs vs submitted IDs).
  // For this MVP, we will Upsert based on ID.
  for (const v of values.variants) {
    if (v.id) {
      // Update existing
      await supabase.from("product_variants").update({
        name: v.name,
        stock: v.stock,
        price_override: v.price_override
      }).eq("id", v.id)
    } else {
      // Insert new
      await supabase.from("product_variants").insert({
        product_id: productId,
        name: v.name,
        stock: v.stock,
        price_override: v.price_override
      })
    }
  }

  revalidatePath("/dashboard/products")
  revalidatePath(`/dashboard/products/${productId}`)
  return { success: true }
}

// --- DELETE PRODUCT ---
export async function deleteProduct(productId: string) {
  const supabase = await createClient()

  // Soft Delete
  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", productId)

  if (error) return { error: error.message }
  
  revalidatePath("/dashboard/products")
  return { success: true }
}

export async function deleteProductVariant(variantId: string) {
  const supabase = await createClient()

  // UBAH DARI DELETE() KE UPDATE()
  const { error } = await supabase
    .from("product_variants")
    .update({ 
      deleted_at: new Date().toISOString() // Isi timestamp saat ini
    })
    .eq("id", variantId)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/products")
  return { success: true }
}