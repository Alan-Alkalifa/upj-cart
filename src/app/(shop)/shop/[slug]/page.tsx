import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ProductCard } from "@/components/shop/product-card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Store, MapPin, Calendar, Star, MessageCircle, Share2, ShieldCheck, Filter, ShoppingBag, Clock, Info, Instagram, Facebook, Globe, Twitter, X, ExternalLink } from "lucide-react"
import Link from "next/link"
import { JumpToProductsBtn } from "@/components/shop/jump-to-product"
import { ShopSearch } from "@/components/shop/shop-search" // Import the new component

export default async function MerchantPage(props: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ q?: string }> // Add searchParams
}) {
  const { slug } = await props.params
  const searchParams = await props.searchParams
  const queryParam = searchParams.q
  const supabase = await createClient()

  const { data: merchant } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!merchant) return notFound()

  // Build Query
  let productQuery = supabase
    .from("products")
    .select(`
      *,
      organizations (name, slug, logo_url),
      product_variants (price_override, stock),
      reviews (rating)
    `)
    .eq("org_id", merchant.id)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  // Apply Search Filter if 'q' exists
  if (queryParam) {
    productQuery = productQuery.ilike('name', `%${queryParam}%`)
  }

  const { data: products } = await productQuery

  const totalProducts = products?.length || 0
  
  // Calculate stats from all products (fetched or separate query would be better for performance, but this works for MVP)
  // Note: If searching, this rating might only reflect searched products. 
  // Ideally, stats should be a separate query if we want them consistent regardless of search.
  // For now, let's keep it simple.
  let totalRating = 0
  let totalReviews = 0
  products?.forEach((p: any) => {
    if (p.reviews && p.reviews.length > 0) {
      p.reviews.forEach((r: any) => {
        totalRating += r.rating
        totalReviews++
      })
    }
  })
  const shopRating = totalReviews > 0 ? (totalRating / totalReviews).toFixed(1) : "Baru"
  const joinDate = new Date(merchant.created_at).toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })

  return (
    <div className="bg-muted/5 min-h-screen pb-20">
      
      {/* 1. BREADCRUMB & HEADER WRAPPER */}
      <div className="bg-background border-b">
        <div className="container mx-auto px-4 py-3 border-b border-dashed">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Beranda</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/search">Toko</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground">{merchant.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Banner Image from DB */}
        {merchant.banner_url ? (
          <div className="h-32 md:h-52 w-full relative overflow-hidden bg-muted">
            <img 
              src={merchant.banner_url} 
              alt="Cover Toko" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-black/10"></div>
          </div>
        ) : (
          <div className="h-32 md:h-52 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>
        )}
        
        <div className="container mx-auto px-4 -mt-16 pb-8 relative z-10">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Logo */}
            <div className="relative shrink-0 group">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-[5px] border-background shadow-xl bg-white rounded-2xl">
                <AvatarImage src={merchant.logo_url} className="object-cover rounded-xl" />
                <AvatarFallback className="text-5xl font-bold bg-primary/5 text-primary rounded-xl">
                  {merchant.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {merchant.status === 'active' && (
                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-1.5 rounded-full border-4 border-background shadow-sm" title="Verified Merchant">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              )}
            </div>

            {/* Text Info */}
            <div className="flex-1 space-y-4 mt-2 md:mt-16 w-full">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <h1 className="text-3xl font-bold tracking-tight mt-4 flex items-center gap-2">
                      {merchant.name}
                      {merchant.status === 'active' && (
                        <Badge variant="secondary" className="text-xs font-normal border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                          Official Store
                        </Badge>
                      )}
                    </h1>
                    <p className="text-muted-foreground mt-2 max-w-2xl text-sm leading-relaxed line-clamp-2">
                      {merchant.description || "Toko mahasiswa Universitas Pembangunan Jaya."}
                    </p>
                  </div>

                  {/* SOCIAL MEDIA LINKS */}
                  <div className="flex items-center gap-2 pt-1">
                    {merchant.instagram_url && (
                      <a href={merchant.instagram_url} target="_blank" rel="noreferrer" className="group relative">
                          <div className="p-2 rounded-full bg-muted/50 hover:bg-pink-50 transition-colors border border-transparent hover:border-pink-200">
                             <Instagram className="h-4 w-4 text-muted-foreground group-hover:text-pink-600 transition-colors" />
                          </div>
                      </a>
                    )}
                    
                    {merchant.tiktok_url && ( // Fixed from social_facebook to match logic or updated column name
                      <a href={merchant.tiktok_url} target="_blank" rel="noreferrer" className="group relative">
                          <div className="p-2 rounded-full bg-muted/50 hover:bg-blue-50 transition-colors border border-transparent hover:border-blue-200">
                             <X className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 transition-colors" />
                          </div>
                      </a>
                    )}
                    
                    {merchant.website_url && (
                      <a href={merchant.website_url} target="_blank" rel="noreferrer" className="group relative">
                          <div className="p-2 rounded-full bg-muted/50 hover:bg-emerald-50 transition-colors border border-transparent hover:border-emerald-200">
                             <Globe className="h-4 w-4 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                          </div>
                      </a>
                    )}
                    
                    {!merchant.instagram_url && !merchant.tiktok_url && !merchant.website_url && (
                       <span className="text-xs text-muted-foreground italic">Kontak sosial media belum tersedia</span>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex gap-3 w-full md:w-auto shrink-0 mt-2 pt-4 md:mt-0">
                  <Button className="flex-1 md:flex-none gap-2 font-semibold shadow-sm">
                      <MessageCircle className="h-4 w-4" /> Chat
                  </Button>
                  <Button variant="outline" className="flex-1 md:flex-none gap-2 shadow-sm">
                      <Share2 className="h-4 w-4" /> Share
                  </Button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-muted-foreground border-t pt-4">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-100 p-1.5 rounded-full text-yellow-600">
                     <Star className="h-4 w-4 fill-yellow-600" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">{shopRating}</span>
                    <span className="text-xs">Rating</span>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="bg-blue-100 p-1.5 rounded-full text-blue-600">
                     <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">{totalProducts}</span>
                    <span className="text-xs">Produk</span>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <div className="bg-green-100 p-1.5 rounded-full text-green-600">
                     <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground block truncate max-w-[150px]">{merchant.address_city || "Tangerang Selatan"}</span>
                    <span className="text-xs">Lokasi</span>
                  </div>
                </div>
                <Separator orientation="vertical" className="h-8 hidden sm:block" />
                <div className="hidden sm:flex items-center gap-2">
                   <div className="bg-purple-100 p-1.5 rounded-full text-purple-600">
                     <Calendar className="h-4 w-4" />
                   </div>
                   <div>
                    <span className="font-bold text-foreground block">{joinDate}</span>
                    <span className="text-xs">Bergabung</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. STICKY TABS & CONTENT */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="products" className="space-y-8">
          
          <div className="sticky top-16 z-30 bg-muted/5 backdrop-blur-md pb-4 pt-2 px-4 md:static md:bg-transparent md:p-0">
             <TabsList className="h-12 w-full sm:w-auto p-1 bg-background/80 border shadow-sm rounded-xl">
               <TabsTrigger 
                 id="products-trigger" 
                 value="products" 
                 className="flex-1 sm:flex-none h-full px-6 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium transition-all"
               >
                 Etalase
               </TabsTrigger>
               
               <TabsTrigger value="about" className="flex-1 sm:flex-none h-full px-6 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium transition-all">
                 Profil Toko
               </TabsTrigger>
               <TabsTrigger value="reviews" className="flex-1 sm:flex-none h-full px-6 rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium transition-all">
                 Ulasan <Badge variant="secondary" className="ml-2 h-5 min-w-[20px] px-1 bg-muted-foreground/10 text-muted-foreground">{totalReviews}</Badge>
               </TabsTrigger>
             </TabsList>
          </div>

          {/* TAB: PRODUCTS */}
          <TabsContent value="products" className="space-y-6 mt-0 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
               <h2 className="font-bold text-lg flex items-center gap-2 shrink-0">
                 Semua Produk <span className="text-muted-foreground font-normal text-sm">({totalProducts})</span>
               </h2>
               
               {/* Search Component Added Here */}
               <div className="flex items-center gap-2 w-full sm:w-auto">
                 <ShopSearch />
                 <Button variant="outline" size="icon" className="shrink-0 h-9 w-9 rounded-full bg-background" title="Filter (Coming Soon)">
                   <Filter className="h-3.5 w-3.5" />
                 </Button>
               </div>
            </div>

            {products && products.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 bg-background rounded-2xl border border-dashed">
                <div className="bg-muted p-4 rounded-full mb-4">
                  <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="font-semibold text-lg">
                  {queryParam ? `Tidak ada produk "${queryParam}"` : "Belum ada produk"}
                </h3>
                <p className="text-muted-foreground text-sm mt-1 max-w-xs text-center">
                  {queryParam ? "Coba kata kunci lain atau hapus pencarian." : "Toko ini sedang menyiapkan produk terbaiknya. Cek kembali nanti!"}
                </p>
                {queryParam && (
                   <Button variant="link" asChild className="mt-2">
                     <Link href={`/shop/${slug}`}>Hapus Pencarian</Link>
                   </Button>
                )}
              </div>
            )}
          </TabsContent>

          {/* TAB: ABOUT */}
          <TabsContent value="about" className="mt-0 animate-in slide-in-from-bottom-2 duration-500">
             <div className="grid md:grid-cols-3 gap-6">
               <Card className="md:col-span-2 shadow-sm border-muted">
                 <CardHeader>
                   <CardTitle className="text-lg flex items-center gap-2">
                     <Info className="h-5 w-5 text-primary" /> Deskripsi Toko
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <p className="text-muted-foreground leading-relaxed whitespace-pre-line text-sm">
                     {merchant.description || "Penjual belum menambahkan deskripsi lengkap mengenai toko ini."}
                   </p>
                 </CardContent>
               </Card>

               <div className="space-y-6">
                 <Card className="shadow-sm border-muted">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" /> Lokasi
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-1">
                      <p className="font-medium">{merchant.address_street || "Alamat belum diatur"}</p>
                      <p className="text-muted-foreground">
                        {merchant.address_district ? `${merchant.address_district}, ` : ""}
                        {merchant.address_city}
                      </p>
                      <p className="text-muted-foreground">{merchant.address_postal_code}</p>
                    </CardContent>
                 </Card>

                 <Card className="shadow-sm border-muted">
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" /> Jam Operasional
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm space-y-3">
                      <div className="flex justify-between items-center border-b border-dashed pb-2">
                        <span className="text-muted-foreground">Senin - Jumat</span> 
                        <span className="font-medium bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">08:00 - 17:00</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Sabtu - Minggu</span> 
                        <span className="font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded text-xs">Libur</span>
                      </div>
                    </CardContent>
                 </Card>
               </div>
             </div>
          </TabsContent>

          {/* TAB: REVIEWS */}
          <TabsContent value="reviews" className="mt-0 animate-in slide-in-from-bottom-2 duration-500">
            <Card className="border-muted bg-muted/5">
              <CardContent className="py-20 flex flex-col items-center text-center">
                 <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                 </div>
                 <h3 className="text-lg font-semibold text-foreground">Ulasan Toko</h3>
                 <p className="max-w-md mt-2 text-sm text-muted-foreground leading-relaxed">
                   Saat ini ulasan ditampilkan per produk. Silakan kunjungi halaman produk untuk melihat ulasan pembeli.
                 </p>
                 <JumpToProductsBtn />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}