import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ProductCard } from "@/components/shop/product-card"
import { ShareButton } from "@/components/shop/share-button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs" 
import { ShopTabsWrapper } from "@/components/shop/shop-tabs-wrapper" 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { MapPin, Calendar, Star, MessageCircle, Share2, ShieldCheck, ShoppingBag, Clock, Info, Instagram, Globe, SlidersHorizontal, SearchX } from "lucide-react"
import Link from "next/link"
import { JumpToProductsBtn } from "@/components/shop/jump-to-product"
import { ShopSearch } from "@/components/shop/shop-search"
import { PriceFilter } from "@/components/shop/price-filter"
import { ProductSort } from "@/components/shop/product-sort"
import { Label } from "@/components/ui/label"
import { Metadata } from "next"
// [NEW IMPORT] Chat Button
import { ChatMerchantButton } from "@/components/shop/chat-merchant-button"

const PRODUCTS_PER_PAGE = 12

// --- 1. GENERATE METADATA ---
export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: merchant } = await supabase
    .from("organizations")
    .select("name, description, logo_url")
    .eq("slug", slug)
    .single()

  if (!merchant) return { title: "Toko Tidak Ditemukan" }

  return {
    title: merchant.name, // "Nama Toko | UPJ Cart"
    description: merchant.description || `Kunjungi official store ${merchant.name} di UPJ Cart.`,
    openGraph: {
      title: `${merchant.name} - Official Store UPJ Cart`,
      description: merchant.description,
      images: merchant.logo_url ? [merchant.logo_url] : [],
    }
  }
}

export default async function MerchantPage(props: { 
  params: Promise<{ slug: string }>,
  searchParams: Promise<{ q?: string; min?: string; max?: string; sort?: string; page?: string }> 
}) {
  const { slug } = await props.params
  const searchParams = await props.searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  // [NEW LOGIC] Determine restrictions for Chat feature
  let isRestricted = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    const userRole = profile?.role;
    // Admins and Merchants cannot initiate chat as buyers
    isRestricted = userRole === "merchant" || userRole === "super_admin";
  }

  const { data: merchant } = await supabase
    .from("organizations")
    .select("*")
    .eq("slug", slug)
    .single()

  if (!merchant) return notFound()

  // --- 2. STRUCTURED DATA (JSON-LD) ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: merchant.name,
    image: merchant.logo_url,
    description: merchant.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: merchant.address_street,
      addressLocality: merchant.address_city,
      addressRegion: "Banten",
      postalCode: merchant.address_postal_code,
      addressCountry: "ID"
    },
    url: `${process.env.NEXT_PUBLIC_SITE_URL}/merchant/${slug}`
  }

  const { data: shopReviews } = await supabase
    .from("reviews")
    .select("rating, products!inner(org_id)")
    .eq("products.org_id", merchant.id)

  const totalReviews = shopReviews?.length || 0
  const averageRating = totalReviews > 0
    ? (shopReviews!.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : "Baru"

  const currentPage = parseInt(searchParams.page || "1")
  const start = (currentPage - 1) * PRODUCTS_PER_PAGE
  const end = start + PRODUCTS_PER_PAGE - 1
  const queryParam = searchParams.q

  let countQuery = supabase
    .from("products")
    .select("id", { count: 'exact', head: true })
    .eq("org_id", merchant.id)
    .eq("is_active", true)
    .is("deleted_at", null)

  if (queryParam) countQuery = countQuery.ilike('name', `%${queryParam}%`)
  if (searchParams.min) countQuery = countQuery.gte("base_price", parseInt(searchParams.min))
  if (searchParams.max) countQuery = countQuery.lte("base_price", parseInt(searchParams.max))

  const { count } = await countQuery
  const totalProducts = count || 0
  const totalPages = Math.ceil(totalProducts / PRODUCTS_PER_PAGE)

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
    .range(start, end)

  if (queryParam) productQuery = productQuery.ilike('name', `%${queryParam}%`)
  if (searchParams.min) productQuery = productQuery.gte("base_price", parseInt(searchParams.min))
  if (searchParams.max) productQuery = productQuery.lte("base_price", parseInt(searchParams.max))

  const sort = searchParams.sort || 'newest'
  switch (sort) {
    case 'price_asc': productQuery = productQuery.order('base_price', { ascending: true }); break
    case 'price_desc': productQuery = productQuery.order('base_price', { ascending: false }); break
    case 'name_asc': productQuery = productQuery.order('name', { ascending: true }); break
    case 'newest': default: productQuery = productQuery.order('created_at', { ascending: false }); break
  }

  const { data: products } = await productQuery

  const joinDate = new Date(merchant.created_at).toLocaleDateString("id-ID", { month: 'long', year: 'numeric' })

  const buildUrl = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    if (searchParams.q) p.set("q", searchParams.q)
    if (searchParams.min) p.set("min", searchParams.min)
    if (searchParams.max) p.set("max", searchParams.max)
    if (searchParams.sort) p.set("sort", searchParams.sort)
    if (searchParams.page && searchParams.page !== "1") p.set("page", searchParams.page)

    Object.entries(updates).forEach(([key, value]) => {
      if (value) p.set(key, value)
      else p.delete(key)
    })
    return `/merchant/${slug}?${p.toString()}`
  }

  return (
    <div className="bg-muted/5 min-h-screen pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      {/* HEADER SECTION (Banner & Info) */}
      <div className="bg-background border-b shadow-sm">
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

        {/* Banner */}
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

            {/* Merchant Details & Actions */}
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
                      {merchant.description || "Toko Civitas Universitas Pembangunan Jaya."}
                    </p>
                  </div>
                  
                  {/* Social Links */}
                  <div className="flex items-center gap-2 pt-1">
                    {merchant.instagram_url && (
                      <a href={merchant.instagram_url} target="_blank" rel="noreferrer" className="group relative">
                          <div className="p-2 rounded-full bg-muted/50 hover:bg-pink-50 transition-colors border border-transparent hover:border-pink-200">
                             <Instagram className="h-4 w-4 text-muted-foreground group-hover:text-pink-600 transition-colors" />
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
                  </div>
                </div>
                
                {/* ACTION BUTTONS (Updated for Responsiveness) */}
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0 mt-2 pt-4 md:mt-0">
                  {/* [NEW] Chat Button */}
                  <ChatMerchantButton 
                    orgId={merchant.id} 
                    isRestricted={isRestricted}
                  />
                  
                  <ShareButton 
                    variant="default" 
                    size="default" 
                    className="flex-1 md:flex-none gap-2 shadow-sm"
                  >
                    <Share2 className="h-4 w-4" /> Share
                  </ShareButton>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-6 text-sm text-muted-foreground border-t pt-4">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-100 p-1.5 rounded-full text-yellow-600">
                      <Star className="h-4 w-4 fill-yellow-600" />
                  </div>
                  <div>
                    <span className="font-bold text-foreground block">{averageRating}</span>
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

      {/* CONTENT TABS */}
      <div className="container mx-auto px-4 py-8">
        <ShopTabsWrapper defaultTab="products" className="space-y-8">
          
          <div className="sticky top-16 z-30 bg-muted/5 backdrop-blur-md pb-4 pt-2 px-4 md:static md:bg-transparent md:p-0">
             <TabsList className="h-12 w-full sm:w-auto p-1 bg-background/80 border shadow-sm rounded-xl overflow-x-auto">
               <TabsTrigger 
                 id="products-trigger" 
                 value="products" 
                 className="flex-1 sm:flex-none h-full px-3 sm:px-6 text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium"
               >
                 Etalase
               </TabsTrigger>
               
               <TabsTrigger 
                 value="about" 
                 className="flex-1 sm:flex-none h-full px-3 sm:px-6 text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium"
               >
                 Profil Toko
               </TabsTrigger>
               
               <TabsTrigger 
                 value="reviews" 
                 className="flex-1 sm:flex-none h-full px-3 sm:px-6 text-xs sm:text-sm rounded-lg data-[state=active]:bg-primary/10 data-[state=active]:text-primary font-medium"
               >
                 Ulasan 
                 <Badge variant="secondary" className="ml-1.5 sm:ml-2 h-5 min-w-[20px] px-1 bg-muted-foreground/10 text-muted-foreground">
                   {totalReviews}
                 </Badge>
               </TabsTrigger>
             </TabsList>
          </div>

          <TabsContent value="products" className="mt-0 animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8">
              <aside className="w-64 hidden md:block space-y-6 sticky top-24 h-fit">
                 <div className="space-y-3">
                   <Label className="font-bold text-sm uppercase tracking-widest">Cari di Toko</Label>
                   <ShopSearch baseUrl={`/merchant/${slug}`} placeholder={`Cari di ${merchant.name}...`} />
                </div>
                <Separator className="opacity-50" />
                <PriceFilter />
                <Separator className="opacity-50" />
                <Card className="bg-primary/5 border-primary/10 shadow-none">
                  <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
                    <Info className="h-4 w-4 mb-2 text-primary" />
                    Gunakan filter harga untuk menemukan produk sesuai budget Anda di toko ini.
                  </CardContent>
                </Card>
              </aside>

              <div className="flex-1">
                <div className="flex flex-col gap-4 mb-6">
                   <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                      <div className="space-y-1">
                        <h2 className="text-xl font-bold tracking-tight">
                          {queryParam ? `Hasil: "${queryParam}"` : "Semua Produk"}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          Menampilkan {products?.length || 0} dari {totalProducts} produk
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto w-full sm:w-auto justify-between sm:justify-end">
                         <ProductSort />
                         <Sheet>
                           <SheetTrigger asChild>
                             <Button variant="outline" size="icon" className="md:hidden rounded-full border-2 h-9 w-9 shrink-0">
                               <SlidersHorizontal className="h-4 w-4" />
                             </Button>
                           </SheetTrigger>
                           
                           <SheetContent side="bottom" className="h-[85vh] rounded-t-[20px] p-0 flex flex-col">
                             <SheetHeader className="p-6 border-b shrink-0">
                               <SheetTitle className="text-left">Filter Produk Toko</SheetTitle>
                             </SheetHeader>
                             
                             <div className="p-6 space-y-6 overflow-y-auto flex-1 pb-20">
                               <section className="space-y-3">
                                 <Label>Cari Produk</Label>
                                 <ShopSearch baseUrl={`/merchant/${slug}`} placeholder={`Cari di ${merchant.name}...`} />
                               </section>
                               <Separator />
                               <section>
                                 <PriceFilter />
                               </section>
                             </div>
                           </SheetContent>
                         </Sheet>
                      </div>
                   </div>
                   <div className="md:hidden">
                      <ShopSearch baseUrl={`/merchant/${slug}`} placeholder={`Cari di ${merchant.name}...`} />
                   </div>
                </div>

                {products && products.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6 mb-12">
                      {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious 
                              href={currentPage > 1 ? buildUrl({ page: (currentPage - 1).toString() }) : "#"} 
                              aria-disabled={currentPage <= 1}
                              className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => {
                             if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1)) {
                               return (
                                 <PaginationItem key={p}>
                                   <PaginationLink href={buildUrl({ page: p.toString() })} isActive={p === currentPage}>
                                     {p}
                                   </PaginationLink>
                                 </PaginationItem>
                               )
                             }
                             if ((p === currentPage - 2 && p > 1) || (p === currentPage + 2 && p < totalPages)) {
                               return <PaginationItem key={p}><PaginationEllipsis /></PaginationItem>
                             }
                             return null
                          })}
                          <PaginationItem>
                            <PaginationNext 
                              href={currentPage < totalPages ? buildUrl({ page: (currentPage + 1).toString() }) : "#"}
                              aria-disabled={currentPage >= totalPages}
                              className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 bg-muted/10 rounded-3xl border-2 border-dashed border-muted">
                    <div className="bg-background p-6 rounded-full shadow-sm mb-4">
                      <SearchX className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                    <h3 className="font-bold text-lg">Produk tidak ditemukan</h3>
                    <p className="text-muted-foreground mb-6 text-sm max-w-xs text-center">
                      Coba atur ulang filter harga atau kata kunci pencarian Anda.
                    </p>
                    <Button asChild variant="outline" className="rounded-full">
                      <Link href={`/shop/${slug}`}>Reset Filter</Link>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

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

          <TabsContent value="reviews" className="mt-0 animate-in slide-in-from-bottom-2 duration-500">
            <Card className="border-muted bg-muted/5">
              <CardContent className="py-20 flex flex-col items-center text-center">
                 <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                 </div>
                 <h3 className="text-lg font-semibold text-foreground">Ulasan Toko</h3>
                 <p className="max-w-md mt-2 text-sm text-muted-foreground leading-relaxed">
                   Lihat ulasan spesifik pada halaman detail produk. Total ada <b>{totalReviews}</b> ulasan untuk toko ini dengan rata-rata rating <b>{averageRating}</b>.
                 </p>
                 <JumpToProductsBtn />
              </CardContent>
            </Card>
          </TabsContent>

        </ShopTabsWrapper>
      </div>
    </div>
  )
}