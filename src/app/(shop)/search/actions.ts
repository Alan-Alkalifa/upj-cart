"use server"

import { createClient } from "@/utils/supabase/server"

const PRODUCTS_PER_PAGE = 12

// --- EXISTING: LOAD MORE PRODUCTS (Untuk Infinite Scroll) ---
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

  // Apply Filters
  if (params.q) query = query.ilike("name", `%${params.q}%`)
  if (params.category) query = query.eq("global_category_id", params.category)
  if (params.min) query = query.gte("base_price", parseInt(params.min))
  if (params.max) query = query.lte("base_price", parseInt(params.max))
  if (params.merchant_id) query = query.eq("org_id", params.merchant_id)

  // Sorting
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

// --- NEW: AUTOCOMPLETE PREVIEW (Untuk Dropdown Search) ---
export async function getSearchPreview(query: string) {
  if (!query || query.length < 2) return { orgs: [], products: [] }

  const supabase = await createClient()

  // Jalankan query paralel agar cepat
  const [orgs, products] = await Promise.all([
    // Cari Toko
    supabase
      .from("organizations")
      .select("id, name, slug, logo_url")
      .ilike("name", `%${query}%`)
      .eq("status", "active")
      .limit(3),

    // Cari Produk
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

// --- NEW: FETCH FULL CARD DATA (Untuk Tampilan Kartu di Halaman Search) ---
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
  const { data } = await supabase
    .from("products")
    .select(`
      id, name, description, base_price, image_url, weight_grams,
      organizations (name, slug, logo_url, address_city),
      reviews (rating)
    `)
    .eq("id", id)
    .single()
  return data
}