"use server"

import { createClient } from "@/utils/supabase/server"

const PRODUCTS_PER_PAGE = 12

// UPDATED: Added merchant_id to params type
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
  
  // Calculate Pagination Range
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
  
  // UPDATED: Filter by merchant (org_id based on supabase.ts)
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