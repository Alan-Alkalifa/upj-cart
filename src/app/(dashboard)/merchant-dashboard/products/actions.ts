"use server"

import { createClient } from "@/utils/supabase/server"
import { productSchema } from "@/lib/dashboard-schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"

function getMainImage(values: z.infer<typeof productSchema>) {
  if (values.gallery_urls && values.gallery_urls.length > 0) {
    return values.gallery_urls[0]
  }
  return values.image_url || ""
}

// --- CREATE PRODUCT ---
export async function createProduct(orgId: string, values: z.infer<typeof productSchema>) {
  const supabase = await createClient()
  
  const mainImage = getMainImage(values)

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
      image_url: mainImage,                    
      gallery_urls: values.gallery_urls || [],
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

    if (varError) return { error: "Product created, but failed to save variants: " + varError.message }
  }

  revalidatePath("/merchant/products")
  return { success: true }
}

// --- UPDATE PRODUCT ---
export async function updateProduct(productId: string, values: z.infer<typeof productSchema>) {
  const supabase = await createClient()

  const mainImage = getMainImage(values)

  // 1. Update Product Details
  const { error: prodError } = await supabase
    .from("products")
    .update({
      global_category_id: values.global_category_id,
      name: values.name,
      description: values.description,
      base_price: values.base_price,
      weight_grams: values.weight_grams,
      image_url: mainImage,
      gallery_urls: values.gallery_urls || [],
      is_active: values.is_active,
      updated_at: new Date().toISOString()
    })
    .eq("id", productId)

  if (prodError) return { error: prodError.message }

  // 2. Upsert Variants
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

  revalidatePath("/merchant/products")
  revalidatePath(`/merchant/products/${productId}`)
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
  
  revalidatePath("/merchant/products")
  return { success: true }
}

export async function deleteProductVariant(variantId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("product_variants")
    .update({ 
      deleted_at: new Date().toISOString()
    })
    .eq("id", variantId)

  if (error) return { error: error.message }

  revalidatePath("/merchant/products")
  return { success: true }
}

export async function createMerchantCategory(orgId: string, name: string) {
  const supabase = await createClient()

  if (!name || name.trim().length === 0) {
    return { error: "Category name cannot be empty" }
  }

  const { error } = await supabase
    .from("merchant_categories")
    .insert({
      org_id: orgId,
      name: name,
    })

  if (error) return { error: error.message }

  revalidatePath("/merchant/products")
  revalidatePath("/merchant/products/create")
  return { success: true }
}

export async function deleteMerchantCategory(categoryId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("merchant_categories")
    .update({ deleted_at: new Date().toISOString() }) 
    .eq("id", categoryId)

  if (error) return { error: error.message }

  revalidatePath("/merchant/products")
  revalidatePath("/merchant/products/create")
  return { success: true }
}

export async function updateMerchantCategory(categoryId: string, name: string) {
  const supabase = await createClient()

  if (!name || name.trim().length === 0) {
    return { error: "Category name cannot be empty" }
  }

  const { error } = await supabase
    .from("merchant_categories")
    .update({ 
        name: name,
        updated_at: new Date().toISOString()
    })
    .eq("id", categoryId)

  if (error) return { error: error.message }

  revalidatePath("/merchant-dashboard/products")
  revalidatePath("/merchant-dashboard/products/create")
  return { success: true }
}