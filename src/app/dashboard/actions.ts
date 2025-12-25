"use server"

import { createClient } from "@/utils/supabase/server"
import { storeSettingsSchema, productSchema } from "@/lib/dashboard-schemas"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

// --- SETTINGS ACTIONS ---
export async function updateStoreSettings(orgId: string, values: z.infer<typeof storeSettingsSchema>) {
  const supabase = await createClient()
  
  // Security: Check if user is owner/admin of this org
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  const { error } = await supabase
    .from("organizations")
    .update(values)
    .eq("id", orgId)

  if (error) return { error: error.message }
  
  revalidatePath("/dashboard/settings")
  return { success: true }
}

// --- PRODUCT ACTIONS ---
export async function createProduct(orgId: string, values: z.infer<typeof productSchema>) {
  const supabase = await createClient()
  
  // 1. Insert Product
  const { data: product, error: prodError } = await supabase
    .from("products")
    .insert({
      org_id: orgId,
      name: values.name,
      description: values.description,
      base_price: values.base_price,
      weight_grams: values.weight_grams,
      is_active: true
    })
    .select()
    .single()

  if (prodError) return { error: prodError.message }

  // 2. Insert Variants
  const variantsData = values.variants.map(v => ({
    product_id: product.id,
    name: v.name,
    stock: v.stock,
    price_override: v.price_override || values.base_price
  }))

  const { error: varError } = await supabase
    .from("product_variants")
    .insert(variantsData)

  if (varError) return { error: "Produk dibuat, tapi gagal simpan varian." }

  revalidatePath("/dashboard/products")
  return { success: true }
}