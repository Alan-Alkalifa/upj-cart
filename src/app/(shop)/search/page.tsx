import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { SlidersHorizontal, Tag } from "lucide-react"
import Link from "next/link"
import { PriceFilter } from "@/components/shop/price-filter"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShopSearch } from "@/components/shop/shop-search"
import { ProductSort } from "@/components/shop/product-sort"
import { ProductGrid } from "@/components/shop/product-grid" // IMPORT BARU

const PRODUCTS_PER_PAGE = 10 // Changed from 12 to 10 as requested

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; min?: string; max?: string; sort?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()
  
  // 1. Initial Query (Halaman 1)
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
    .range(0, PRODUCTS_PER_PAGE - 1) // Fetch first 10 items

  // Apply Filter
  if (params.q) query = query.ilike("name", `%${params.q}%`)
  if (params.category) query = query.eq("global_category_id", params.category)
  if (params.min) query = query.gte("base_price", parseInt(params.min))
  if (params.max) query = query.lte("base_price", parseInt(params.max))

  // Sorting
  const sort = params.sort || 'newest'
  switch (sort) {
    case 'price_asc': query = query.order('base_price', { ascending: true }); break
    case 'price_desc': query = query.order('base_price', { ascending: false }); break
    case 'name_asc': query = query.order('name', { ascending: true }); break
    case 'newest': default: query = query.order('created_at', { ascending: false }); break
  }

  const { data: products } = await query
  const { data: categories } = await supabase.from("global_categories").select("*").order("name")

  // Helper URL Builder
  const buildUrl = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (params.q) p.set("q", params.q)
    if (params.category) p.set("category", params.category)
    if (params.min) p.set("min", params.min)
    if (params.max) p.set("max", params.max)
    if (params.sort) p.set("sort", params.sort)

    Object.entries(updates).forEach(([key, value]) => {
      if (value) p.set(key, value)
      else p.delete(key)
    })
    return `/search?${p.toString()}`
  }

  const getCategoryUrl = (catId?: string) => buildUrl({ category: catId })

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* SIDEBAR (Hidden on Mobile) */}
        <aside className="w-64 hidden md:block space-y-8 sticky top-24 h-fit">
           <div className="space-y-3">
             <Label className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Cari Produk</Label>
             <ShopSearch />
          </div>
          <Separator className="opacity-50" />
          
          <div className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
              <Tag className="h-4 w-4" /> Kategori
            </h3>
            <div className="flex flex-col gap-1">
              <Link href={getCategoryUrl()} className={`text-sm px-3 py-2 rounded-lg transition-all font-medium ${!params.category ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                Semua Produk
              </Link>
              {categories?.map((cat) => (
                <Link key={cat.id} href={getCategoryUrl(cat.id)} className={`text-sm px-3 py-2 rounded-lg transition-all font-medium ${params.category === cat.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
          <Separator className="opacity-50" />
          <PriceFilter />
        </aside>

        {/* MAIN CONTENT */}
        <div className="flex-1">
          {/* Header Area */}
          <div className="flex flex-col gap-4 mb-6 md:mb-8">
             <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                    {params.q ? `Hasil: "${params.q}"` : 
                     params.category ? categories?.find(c => c.id === params.category)?.name || "Kategori" : 
                     "Semua Produk"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                     Menampilkan produk terbaik untuk Anda
                  </p>
                </div>
                
                <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                   <ProductSort />
                   <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline" size="icon" className="md:hidden rounded-full border-2 h-10 w-10 shrink-0">
                          <SlidersHorizontal className="h-4 w-4" />
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0">
                        <SheetHeader className="p-6 border-b">
                          <SheetTitle className="text-left">Filter & Kategori</SheetTitle>
                        </SheetHeader>
                        <ScrollArea className="h-full px-6 py-6">
                          <div className="space-y-8 pb-10">
                            <section><PriceFilter /></section>
                            <Separator />
                            <section className="space-y-4">
                              <Label className="font-bold text-base flex items-center gap-2">
                                <Tag className="h-4 w-4" /> Kategori
                              </Label>
                              <div className="grid grid-cols-2 gap-2">
                                <Link href={getCategoryUrl()} className={`text-sm px-4 py-3 rounded-xl border transition-all text-center ${!params.category ? "bg-primary text-primary-foreground border-primary font-bold" : "bg-card text-muted-foreground border-border"}`}>Semua</Link>
                                {categories?.map((cat) => (
                                  <Link key={cat.id} href={getCategoryUrl(cat.id)} className={`text-sm px-4 py-3 rounded-xl border transition-all text-center line-clamp-1 ${params.category === cat.id ? "bg-primary text-primary-foreground border-primary font-bold" : "bg-card text-muted-foreground border-border"}`}>{cat.name}</Link>
                                ))}
                              </div>
                            </section>
                          </div>
                        </ScrollArea>
                      </SheetContent>
                   </Sheet>
                </div>
             </div>
             <div className="md:hidden"><ShopSearch /></div>
          </div>

          {/* Product Grid with Load More */}
          <ProductGrid 
            initialProducts={products || []} 
            searchParams={params} 
          />
          
        </div>
      </div>
    </div>
  )
}