import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

// UI Components
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Sparkles, Tag } from "lucide-react"
import { BannerCarousel } from "@/components/shop/banner-carousel"
import { ProductCard } from "@/components/shop/product-card"

export default async function ShopPage() {
  const supabase = await createClient()

  // 1. Fetch Kategori Global (Ambil 3 Kategori Utama)
  const { data: featuredCategories } = await supabase
    .from("global_categories")
    .select("*")
    .limit(3)
    .order("name")

  // 2. Fetch Produk per Kategori
  const categorySections = await Promise.all(
    (featuredCategories || []).map(async (cat) => {
      const { data: products } = await supabase
        .from("products")
        .select(`
          *,
          organizations (name, slug, logo_url),
          product_variants (price_override, stock),
          reviews (rating)
        `)
        .eq("global_category_id", cat.id)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(4)

      return {
        ...cat,
        products: products || []
      }
    })
  )

  // 3. Fetch Produk Terlaris / Terbaru
  const { data: bestSellers } = await supabase
    .from("products")
    .select(`
      *,
      organizations (name, slug, logo_url),
      product_variants (price_override, stock),
      reviews (rating)
    `)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(8)

  return (
    <div className="space-y-12 pb-20">
      
      {/* 1. HERO BANNER */}
      <section className="container mx-auto px-4 mt-6">
        <BannerCarousel />
      </section>

      {/* 2. KATEGORI PILIHAN */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">Kategori Pilihan</h2>
          <Button variant="link" asChild className="text-primary p-0 h-auto">
            <Link href="/search">Lihat Semua</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {featuredCategories?.map((cat) => (
            <Link 
              key={cat.id} 
              href={`/search?category=${cat.id}`}
              className="group flex flex-col items-center justify-center p-6 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all text-center gap-4 shadow-sm hover:shadow-md"
            >
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <Tag className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium group-hover:text-primary transition-colors">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. PRODUK TERLARIS */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-full text-red-600">
              <Sparkles className="h-5 w-5" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">
              Sedang Hangat
            </h2>
            <Badge variant="secondary" className="hidden sm:inline-flex bg-red-100 text-red-700 hover:bg-red-100 border-red-200">
              Hot Item 🔥
            </Badge>
          </div>
          <Button asChild variant="ghost" size="sm" className="hover:bg-transparent hover:text-primary">
            <Link href="/search?sort=newest">Lihat Semua <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
          {bestSellers && bestSellers.length > 0 ? (
            // PERBAIKAN: Menambahkan tipe : any pada parameter map
            bestSellers.map((product: any) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
              Belum ada produk unggulan saat ini.
            </div>
          )}
        </div>
      </section>

      {/* 4. PRODUK PER KATEGORI */}
      {categorySections.map((section) => (
        section.products.length > 0 && (
          <section key={section.id} className="container mx-auto px-4 pt-8 border-t border-dashed">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                  <Tag className="h-5 w-5" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                  {section.name}
                </h2>
              </div>
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/search?category=${section.id}`}>
                  Cek {section.name} Lainnya <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4 md:gap-6">
              {/* PERBAIKAN: Menambahkan tipe : any pada parameter map */}
              {section.products.map((product: any) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        )
      ))}

      {/* CTA Bottom Banner */}
      <section className="container mx-auto px-4 mt-8">
        <div className="bg-primary/5 border-2 border-primary/10 rounded-3xl p-8 md:p-12 text-center space-y-4 relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight text-primary">Ingin Jualan di UPJ Cart?</h3>
            <p className="text-muted-foreground max-w-lg mx-auto text-base md:text-lg">
              Daftarkan tokomu sekarang dan jangkau ribuan mahasiswa dan civitas akademika UPJ dengan mudah.
            </p>
            <div className="pt-6">
              <Button size="lg" className="rounded-full px-8 shadow-xl shadow-primary/20 text-base font-bold" asChild>
                <Link href="/merchant-register">Buka Toko Gratis</Link>
              </Button>
            </div>
          </div>
          <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
        </div>
      </section>

    </div>
  )
}