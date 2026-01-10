import { MetadataRoute } from 'next';
import { createClient } from "@/utils/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = await createClient();
  
  // Uses the URL defined in your layout metadata or fallback to the project domain
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://Bemlanja.com';

  // 1. Static Routes
  const staticRoutes = [
    '',
    '/search',
    '/cart',
    '/login',
    '/register',
    '/merchant-register',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 1.0,
  }));

  // 2. Dynamic Product Routes
  // Combined with logic from ShopPage to only index active and non-deleted products
  const { data: products } = await supabase
    .from("products")
    .select("id, updated_at")
    .eq("is_active", true)
    .is("deleted_at", null);

  const productRoutes = (products || []).map((product) => ({
    url: `${baseUrl}/products/${product.id}`,
    lastModified: new Date(product.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  // 3. Dynamic Merchant Routes
  // Updated to use 'organizations' table as per your Supabase schema
  const { data: merchants } = await supabase
    .from("organizations")
    .select("slug, created_at");

  const merchantRoutes = (merchants || []).map((merchant) => ({
    url: `${baseUrl}/merchant/${merchant.slug}`,
    lastModified: new Date(merchant.created_at || new Date()),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...productRoutes, ...merchantRoutes];
}