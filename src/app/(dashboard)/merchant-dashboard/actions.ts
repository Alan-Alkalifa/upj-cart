"use server";

import { createClient } from "@/utils/supabase/server";
import { storeSettingsSchema, productSchema } from "@/lib/dashboard-schemas";
import { revalidatePath } from "next/cache";
import { z } from "zod";

function getMainImage(values: z.infer<typeof productSchema>) {
  if (values.gallery_urls && values.gallery_urls.length > 0) {
    return values.gallery_urls[0];
  }
  return values.image_url || "";
}

// --- SETTINGS ACTIONS ---
export async function updateStoreSettings(
  orgId: string,
  values: z.infer<typeof storeSettingsSchema>
) {
  const supabase = await createClient();

  // Security: Check if user is owner/admin of this org
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("organizations")
    .update(values)
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/merchant/settings");
  return { success: true };
}

// --- CREATE PRODUCT ---
export async function createProduct(
  orgId: string,
  values: z.infer<typeof productSchema>
) {
  const supabase = await createClient();
  const mainImage = getMainImage(values); // Now this will work

  const { data: product, error: prodError } = await supabase
    .from("products")
    .insert({
      org_id: orgId,
      global_category_id: values.global_category_id,
      merchant_category_id: values.merchant_category_id, // Now this will work
      name: values.name,
      description: values.description,
      base_price: values.base_price,
      weight_grams: values.weight_grams,
      image_url: mainImage,
      gallery_urls: values.gallery_urls || [],
      is_active: values.is_active,
    })
    .select()
    .single();

  // 2. Insert Variants
  const variantsData = values.variants.map((v) => ({
    product_id: product.id,
    name: v.name,
    stock: v.stock,
    price_override: v.price_override || values.base_price,
  }));

  const { error: varError } = await supabase
    .from("product_variants")
    .insert(variantsData);

  if (varError) return { error: "Produk dibuat, tapi gagal simpan varian." };

  revalidatePath("/merchant/products");
  return { success: true };
}

export async function updateProduct(productId: string, values: z.infer<typeof productSchema>) {
  const supabase = await createClient()
  const mainImage = getMainImage(values)

  // 1. Update Product Details
  const { error: prodError } = await supabase
    .from("products")
    .update({
      global_category_id: values.global_category_id,
      merchant_category_id: values.merchant_category_id,
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
  for (const v of values.variants) {
    if (v.id) {
      await supabase.from("product_variants").update({
        name: v.name,
        stock: v.stock,
        price_override: v.price_override
      }).eq("id", v.id)
    } else {
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

export async function createMerchantCategory(orgId: string, name: string) {
  const supabase = await createClient();

  if (!name || name.trim().length === 0) {
    return { error: "Nama kategori tidak boleh kosong" };
  }

  const { error } = await supabase.from("merchant_categories").insert({
    org_id: orgId,
    name: name,
  });

  if (error) return { error: error.message };

  revalidatePath("/merchant/products");
  revalidatePath("/merchant/products/create");
  return { success: true };
}

export async function deleteMerchantCategory(categoryId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("merchant_categories")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", categoryId);

  if (error) return { error: error.message };

  revalidatePath("/merchant/products");
  revalidatePath("/merchant/products/create");
  return { success: true };
}
