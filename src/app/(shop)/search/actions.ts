"use server"

import { createClient } from "@/utils/supabase/server"

const PRODUCTS_PER_PAGE = 12

// --- EXISTING: LOAD MORE PRODUCTS ---
export async function getMoreProducts(
  page: number, 
  params: { 
    q?: string; 
    category?: string; 
    min?: string; 
    max?: string; 
    sort?: string; 
    merchant_id?: string 
  }
) {
  const supabase = await createClient()
  
  const start = (page - 1) * PRODUCTS_PER_PAGE
  const end = start + PRODUCTS_PER_PAGE - 1

  let query = supabase
    .from("products")
    .select(`
      *,
      organizations (name, slug, logo_url),
      product_variants (price_override, stock),
      reviews (rating),
      global_categories (id, name)
    `)
    .eq("is_active", true)
    .is("deleted_at", null)
    .range(start, end)

  if (params.q) query = query.ilike("name", `%${params.q}%`)
  if (params.category) query = query.eq("global_category_id", params.category)
  if (params.min) query = query.gte("base_price", parseInt(params.min))
  if (params.max) query = query.lte("base_price", parseInt(params.max))
  if (params.merchant_id) query = query.eq("org_id", params.merchant_id)

  const sort = params.sort || 'newest'
  switch (sort) {
    case 'price_asc': query = query.order('base_price', { ascending: true }); break
    case 'price_desc': query = query.order('base_price', { ascending: false }); break
    case 'name_asc': query = query.order('name', { ascending: true }); break
    case 'newest': default: query = query.order('created_at', { ascending: false }); break
  }

  const { data } = await query
  return data || []
}

// --- EXISTING: AUTOCOMPLETE PREVIEW ---
export async function getSearchPreview(query: string) {
  if (!query || query.length < 2) return { orgs: [], products: [] }

  const supabase = await createClient()

  const [orgs, products] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, slug, logo_url")
      .ilike("name", `%${query}%`)
      .eq("status", "active")
      .limit(3),

    supabase
      .from("products")
      .select(`
        id, 
        name, 
        image_url, 
        base_price, 
        organizations!inner(slug, status)
      `)
      .eq("is_active", true)
      .eq("organizations.status", "active")
      .ilike("name", `%${query}%`)
      .limit(5)
  ])

  return {
    orgs: orgs.data || [],
    products: products.data || []
  }
}

// --- PREVIEW CARD DATA FETCHING ---

export async function getStorePreview(slug: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, banner_url, description, address_city")
    .eq("slug", slug)
    .single()
  return data
}

export async function getProductPreview(id: string) {
  const supabase = await createClient()

  // 1. Coba ambil data LENGKAP dengan product_images (Carousel)
  // Gunakan try-catch atau cek error untuk fallback jika tabel tidak ada
  const { data, error } = await supabase
    .from("products")
    .select(`
      id, name, description, base_price, image_url, weight_grams,
      organizations (name, slug, logo_url, address_city),
      reviews (rating),
      product_variants (price_override),
      product_images (image_url)
    `)
    .eq("id", id)
    .single()

  if (!error && data) {
    return data
  }

  // 2. Fallback: Jika gagal (misal tabel product_images belum dibuat),
  // ambil data dasar tanpa product_images agar card tetap muncul.
  console.warn("Fetching product with images failed, trying fallback:", error?.message)
  
  const { data: fallbackData } = await supabase
    .from("products")
    .select(`
      id, name, description, base_price, image_url, weight_grams,
      organizations (name, slug, logo_url, address_city),
      reviews (rating),
      product_variants (price_override)
    `)
    .eq("id", id)
    .single()

  return fallbackData
}