import { createClient } from "@/utils/supabase/server"
import { ProductCard } from "@/components/shop/product-card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Filter, SlidersHorizontal, SearchX, Tag } from "lucide-react"
import Link from "next/link"
import { PriceFilter } from "@/components/shop/price-filter"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ShopSearch } from "@/components/shop/shop-search" // Menggunakan komponen search yang sudah didebounce

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; min?: string; max?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // 1. Build Query Supabase
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

  if (params.q) query = query.ilike("name", `%${params.q}%`)
  if (params.category) query = query.eq("global_category_id", params.category)
  if (params.min) query = query.gte("base_price", parseInt(params.min))
  if (params.max) query = query.lte("base_price", parseInt(params.max))

  const { data: products } = await query
  const { data: categories } = await supabase.from("global_categories").select("*").order("name")

  const getCategoryUrl = (catId?: string) => {
    const p = new URLSearchParams()
    if (params.q) p.set("q", params.q)
    if (params.min) p.set("min", params.min)
    if (params.max) p.set("max", params.max)
    if (catId) p.set("category", catId)
    return `/search?${p.toString()}`
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8">
      <div className="flex flex-col md:flex-row gap-6 md:gap-8">
        
        {/* SIDEBAR (Desktop) */}
        <aside className="w-64 hidden md:block space-y-8 sticky top-24 h-fit">
          {/* Pencarian Desktop (Optional jika ingin ada di sidebar juga) */}
          <div className="space-y-3">
             <Label className="font-bold text-sm uppercase tracking-widest">Cari Produk</Label>
             <ShopSearch />
          </div>
          <Separator className="opacity-50" />
          
          <div className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-widest flex items-center gap-2">
              <Tag className="h-4 w-4" /> Kategori
            </h3>
            <div className="flex flex-col gap-1">
              <Link 
                href={getCategoryUrl()} 
                className={`text-sm px-3 py-2 rounded-lg transition-all ${!params.category ? "bg-primary text-primary-foreground font-bold shadow-md" : "text-muted-foreground hover:bg-muted"}`}
              >
                Semua Produk
              </Link>
              {categories?.map((cat) => (
                <Link 
                  key={cat.id} 
                  href={getCategoryUrl(cat.id)}
                  className={`text-sm px-3 py-2 rounded-lg transition-all ${params.category === cat.id ? "bg-primary text-primary-foreground font-bold shadow-md" : "text-muted-foreground hover:bg-muted"}`}
                >
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
          {/* Mobile Search & Header */}
          <div className="flex flex-col gap-4 mb-6 md:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-black tracking-tight">
                  {params.q ? `Hasil: "${params.q}"` : "Katalog Produk"}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded">
                    {products?.length || 0} Barang ditemukan
                  </span>
                  {params.min && <Badge variant="outline" className="text-[10px] border-primary/30">Min: Rp{parseInt(params.min).toLocaleString()}</Badge>}
                  {params.max && <Badge variant="outline" className="text-[10px] border-primary/30">Max: Rp{parseInt(params.max).toLocaleString()}</Badge>}
                </div>
              </div>

              {/* Mobile Filter Trigger */}
              <div className="flex items-center gap-2 md:hidden">
                {/* Search Field for Mobile */}
                <div className="flex-1">
                  <ShopSearch />
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full border-2 h-10 w-10 shrink-0">
                      <SlidersHorizontal className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0">
                    <SheetHeader className="p-6 border-b">
                      <SheetTitle className="text-left">Filter & Kategori</SheetTitle>
                    </SheetHeader>
                    <ScrollArea className="h-full px-6 py-6">
                      <div className="space-y-8 pb-10">
                        <section>
                           <PriceFilter />
                        </section>
                        <Separator />
                        <section className="space-y-4">
                          <Label className="font-bold text-base flex items-center gap-2">
                            <Tag className="h-4 w-4" /> Kategori
                          </Label>
                          <div className="grid grid-cols-2 gap-2">
                            <Link 
                              href={getCategoryUrl()} 
                              className={`text-sm px-4 py-3 rounded-xl border transition-all text-center ${!params.category ? "bg-primary text-primary-foreground border-primary font-bold" : "bg-card text-muted-foreground border-border"}`}
                            >
                              Semua
                            </Link>
                            {categories?.map((cat) => (
                              <Link 
                                key={cat.id} 
                                href={getCategoryUrl(cat.id)}
                                className={`text-sm px-4 py-3 rounded-xl border transition-all text-center line-clamp-1 ${params.category === cat.id ? "bg-primary text-primary-foreground border-primary font-bold" : "bg-card text-muted-foreground border-border"}`}
                              >
                                {cat.name}
                              </Link>
                            ))}
                          </div>
                        </section>
                      </div>
                    </ScrollArea>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {products && products.length > 0 ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 md:py-32 bg-muted/10 rounded-3xl border-2 border-dashed border-muted">
              <div className="bg-background p-6 rounded-full shadow-sm mb-4">
                <SearchX className="h-10 w-10 text-muted-foreground/50" />
              </div>
              <h3 className="font-bold text-lg md:text-xl">Produk tidak ditemukan</h3>
              <p className="text-muted-foreground mb-8 text-sm max-w-[250px] md:max-w-xs text-center">
                Kami tidak menemukan hasil untuk kriteria pencarian Anda.
              </p>
              <Button asChild className="rounded-full px-8 shadow-lg shadow-primary/20">
                <Link href="/search">Reset Semua Filter</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}