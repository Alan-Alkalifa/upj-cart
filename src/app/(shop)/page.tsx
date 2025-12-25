import Link from "next/link"
import { createClient } from "@/utils/supabase/server"

// UI Components
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star, ArrowRight, TrendingUp, ShoppingBag } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()

  // --- PARALLEL FETCHING DATA ---
  const [categoriesRes, productsRes] = await Promise.all([
    // 1. Ambil Kategori Global
    supabase.from("global_categories").select("*").order("name"),
    
    // 2. Ambil Produk Terbaru (Yang Aktif & Tidak Dihapus)
    supabase
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
      .limit(12)
  ])

  const categories = categoriesRes.data || []
  const products = productsRes.data || []

  // Banner Dummy (Idealnya dari DB Settings di masa depan)
  const banners = [
    { id: 1, url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop", title: "Dukung Produk Teman Kampus!", subtitle: "Temukan kreasi unik dari mahasiswa UPJ." },
    { id: 2, url: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=2070&auto=format&fit=crop", title: "Jajanan & Katering", subtitle: "Lapar saat nugas? Pesan di sini." },
    { id: 3, url: "https://images.unsplash.com/photo-1555529733-0e670560f7e1?q=80&w=2070&auto=format&fit=crop", title: "Jasa Desain & Cetak", subtitle: "Butuh bantuan tugas? Cari freelancer kampus." },
  ]

  return (
    <div className="space-y-12 pb-20">
      
      {/* 1. HERO BANNER (Carousel) */}
      <section className="container mx-auto px-4 mt-6">
        <Carousel className="w-full rounded-2xl overflow-hidden shadow-xl" opts={{ loop: true }}>
          <CarouselContent>
            {banners.map((banner) => (
              <CarouselItem key={banner.id}>
                <div className="relative aspect-[2/1] md:aspect-[3/1] lg:aspect-[3.5/1] w-full bg-muted">
                  <img 
                    src={banner.url} 
                    alt={banner.title} 
                    className="object-cover w-full h-full brightness-75"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6 md:p-12">
                    <div className="text-white max-w-2xl animate-in slide-in-from-bottom-4 duration-700">
                      <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight">{banner.title}</h2>
                      <p className="text-white/90 text-sm md:text-lg mb-6">{banner.subtitle}</p>
                      <Button asChild size="lg" className="bg-white text-black hover:bg-white/90 font-semibold rounded-full px-8">
                        <Link href="/search">Mulai Belanja</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-4 bg-white/20 hover:bg-white/40 border-none text-white hidden md:flex" />
          <CarouselNext className="right-4 bg-white/20 hover:bg-white/40 border-none text-white hidden md:flex" />
        </Carousel>
      </section>

      {/* 2. CATEGORIES */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Kategori Pilihan</h2>
          <Button variant="link" asChild className="text-primary p-0 h-auto">
            <Link href="/search">Lihat Semua</Link>
          </Button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {categories.map((cat) => (
            <Link 
              key={cat.id} 
              href={`/search?category=${cat.id}`}
              className="group flex flex-col items-center justify-center p-6 rounded-xl border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all text-center gap-4 shadow-sm hover:shadow-md"
            >
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all duration-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="text-sm font-medium group-hover:text-primary transition-colors">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 3. LATEST PRODUCTS */}
      <section className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-full text-primary">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">
              Produk Terbaru
            </h2>
            <Badge variant="secondary" className="hidden sm:inline-flex bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200">
              Fresh Drop 🔥
            </Badge>
          </div>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/search">Lihat Semua <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {products.length === 0 ? (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-muted/30 rounded-xl border border-dashed">
              Belum ada produk yang aktif.
            </div>
          ) : (
            products.map((product: any) => {
              // Hitung Rating
              const reviews = product.reviews || []
              const avgRating = reviews.length > 0 
                ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
                : null

              return (
                <Link key={product.id} href={`/products/${product.id}`} className="group h-full">
                  <Card className="h-full overflow-hidden hover:shadow-lg transition-all duration-300 border-muted shadow-sm flex flex-col group-hover:-translate-y-1">
                    {/* Image Container */}
                    <div className="aspect-square relative bg-muted overflow-hidden">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-xs bg-muted/50">
                          No Image
                        </div>
                      )}
                      
                      {/* Badge Toko (Overlay) */}
                      <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5 bg-white/95 backdrop-blur px-2.5 py-1.5 rounded-full text-[10px] shadow-sm border border-black/5 opacity-90 group-hover:opacity-100 transition-opacity">
                         <Avatar className="h-4 w-4 border border-black/10">
                           <AvatarImage src={product.organizations?.logo_url} />
                           <AvatarFallback className="text-[8px]">TK</AvatarFallback>
                         </Avatar>
                         <span className="truncate font-medium text-foreground/80 max-w-[100px]">
                           {product.organizations?.name}
                         </span>
                      </div>
                    </div>

                    {/* Content */}
                    <CardContent className="p-4 flex-1 flex flex-col gap-2">
                      <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5em] group-hover:text-primary transition-colors leading-relaxed">
                        {product.name}
                      </h3>
                      
                      <div className="mt-auto">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-base md:text-lg text-primary">
                            Rp {product.base_price.toLocaleString("id-ID")}
                          </span>
                        </div>
                        
                        {/* Rating Section */}
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          {avgRating ? (
                            <>
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium text-foreground">{avgRating}</span>
                              <span className="text-muted-foreground/60">({reviews.length})</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground/60">Belum ada ulasan</span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })
          )}
        </div>
      </section>

    </div>
  )
}