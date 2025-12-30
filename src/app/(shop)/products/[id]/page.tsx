import { createClient } from "@/utils/supabase/server"
import { notFound } from "next/navigation"
import { ProductDetailClient } from "@/components/shop/product-detail-client"
import { ProductImageCarousel } from "@/components/shop/product-image-carousel" // New Component
import { FloatingChat } from "@/components/chat/floating-chat" 
import { ShareButton } from "@/components/shop/share-button" 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Star, Store, MapPin, ShieldCheck, Truck, MessageCircle } from "lucide-react"
import Link from "next/link"

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Fetch User Data (Required for Chat & Role Check)
  const { data: { user } } = await supabase.auth.getUser()

  // 2. Check Role (To Restrict Buy/Chat features for Merchants)
  let userRole = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
    userRole = profile?.role
  }

  const isRestricted = userRole === 'merchant' || userRole === 'super_admin';

  // 3. Fetch Product Data with Relations
  const { data: product } = await supabase
    .from("products")
    .select(`
      *,
      organizations (*),
      product_variants (*),
      global_categories (id, name),
      reviews (
        *,
        profiles (full_name, avatar_url)
      )
    `)
    .eq("id", id)
    .single()

  if (!product) notFound()

  // Calculate Rating
  const reviews = product.reviews || []
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "0.0"

  // Filter active variants
  const activeVariants = product.product_variants.filter((v: any) => v.deleted_at === null)
  product.product_variants = activeVariants

  // PREPARE IMAGES
  // Prioritize gallery_urls, fallback to single image_url
  const images = (product.gallery_urls && product.gallery_urls.length > 0) 
    ? product.gallery_urls 
    : (product.image_url ? [product.image_url] : [])

  return (
    <div className="bg-background min-h-screen pb-20">
      {/* BREADCRUMBS SECTION */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Beranda</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href="/search">Produk</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink href={`/search?category=${product.global_categories?.id}`}>
                  {product.global_categories?.name || "Umum"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-semibold text-foreground">{product.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 lg:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* LEFT COLUMN: PRODUCT IMAGES (Sticky on Desktop) */}
          <div className="lg:col-span-5 xl:col-span-5 h-fit lg:sticky lg:top-24">
            
            {/* CAROUSEL COMPONENT */}
            <ProductImageCarousel images={images} productName={product.name} />
            
            {/* Merchant Info (Mobile Only) */}
            <div className="lg:hidden mt-6">
               <MerchantCard 
                 organization={product.organizations} 
                 currentUserId={user?.id || null} 
                 isRestricted={isRestricted} 
               />
            </div>
          </div>

          {/* RIGHT COLUMN: PRODUCT DETAILS */}
          <div className="lg:col-span-7 xl:col-span-6 space-y-8">
            
            {/* Header Info */}
            <div className="space-y-4">
              <div className="flex justify-between items-start gap-4">
                <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground leading-tight">
                  {product.name}
                </h1>
                {/* Wishlist & Share Buttons */}
                <div className="flex gap-2 shrink-0">
                   <ShareButton />
                </div>
              </div>

              {/* Rating & Stats */}
              <div className="flex items-center gap-4 text-sm flex-wrap">
                <div className="flex items-center gap-1.5 bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-100 text-yellow-800">
                  <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  <span className="font-bold">{avgRating}</span>
                  <span className="text-muted-foreground/60 font-normal ml-1">({reviews.length} Ulasan)</span>
                </div>
                <Separator orientation="vertical" className="h-4" />
                <div className="flex items-center gap-1.5 text-muted-foreground">
                   <Truck className="h-4 w-4" />
                   <span>Dikirim dari <b>{product.organizations.address_city || "Kampus UPJ"}</b></span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Price & Cart Actions (Client Component) */}
            <ProductDetailClient product={product} isRestricted={isRestricted} />

            {/* Trust Signals */}
            <div className="grid grid-cols-2 gap-3">
               <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                  <ShieldCheck className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm">
                      <p className="font-medium text-foreground">Jaminan Aman</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Uang kembali jika pesanan tidak sesuai.</p>
                  </div>
               </div>
               <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border">
                  <Store className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                      <p className="font-medium text-foreground">Verified Merchant</p>
                      <p className="text-muted-foreground text-xs mt-0.5">Penjual terverifikasi dari civitas UPJ.</p>
                  </div>
               </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-4">
               <h3 className="font-bold text-lg">Deskripsi Produk</h3>
               <div className="prose prose-sm prose-neutral max-w-none text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
               </div>
            </div>

            <Separator />

            {/* Merchant Info (Desktop Only) */}
            <div className="hidden lg:block">
              <h3 className="font-bold text-lg mb-4">Informasi Penjual</h3>
              <MerchantCard 
                organization={product.organizations} 
                currentUserId={user?.id || null}
                isRestricted={isRestricted} 
              />
            </div>

            {/* Reviews Section */}
            <div className="space-y-6 pt-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                Ulasan Pembeli 
                <Badge variant="secondary" className="rounded-full">{reviews.length}</Badge>
              </h3>
              
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="text-muted-foreground bg-muted/20 p-8 rounded-xl border border-dashed text-center">
                    Belum ada ulasan untuk produk ini.
                  </div>
                ) : (
                  reviews.map((review: any) => (
                    <div key={review.id} className="flex gap-4 p-5 bg-card rounded-xl border shadow-sm">
                      <Avatar className="h-10 w-10 border bg-muted">
                        <AvatarImage src={review.profiles?.avatar_url} />
                        <AvatarFallback>{review.profiles?.full_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-semibold text-sm">{review.profiles?.full_name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{new Date(review.created_at).toLocaleDateString("id-ID", { dateStyle: 'medium' })}</div>
                          </div>
                          <div className="flex text-yellow-500">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-current" : "text-muted/30"}`} />
                            ))}
                          </div>
                        </div>
                        
                        <p className="text-sm text-foreground/80 leading-relaxed">{review.comment}</p>
                        
                        {review.reply_comment && (
                          <div className="mt-3 bg-muted/50 p-3 rounded-lg text-sm border-l-2 border-primary">
                            <div className="flex items-center gap-2 mb-1">
                              <Store className="h-3 w-3 text-primary" />
                              <span className="font-semibold text-xs text-primary">Respon Penjual</span>
                            </div>
                            <p className="text-muted-foreground text-xs">{review.reply_comment}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

function MerchantCard({ 
  organization, 
  currentUserId,
  isRestricted = false 
}: { 
  organization: any;
  currentUserId: string | null;
  isRestricted?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 bg-card rounded-xl border hover:border-primary/50 transition-colors shadow-sm group">
      
      <div className="flex items-center gap-4 flex-1 w-full">
        <Avatar className="h-14 w-14 sm:h-16 sm:w-16 border bg-white shadow-sm group-hover:scale-105 transition-transform shrink-0">
          <AvatarImage src={organization.logo_url} className="object-cover" />
          <AvatarFallback>TK</AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-base truncate flex items-center gap-2">
            {organization.name}
            <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-700 border-blue-200 shrink-0">
              Verified
            </Badge>
          </h4>
          <p className="text-sm text-muted-foreground truncate mt-1">
            {organization.description || "Toko mahasiswa terpercaya di UPJ."}
          </p>
          <div className="flex items-center gap-4 mt-2 sm:mt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
               <MapPin className="h-3.5 w-3.5" /> 
               <span className="truncate max-w-[150px]">{organization.address_city || "Tangerang Selatan"}</span>
            </div>
            <Separator orientation="vertical" className="h-3" />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 w-full sm:w-auto shrink-0 mt-2 sm:mt-0">
        
        {!isRestricted && (
            currentUserId ? (
                <FloatingChat 
                    currentUserId={currentUserId}
                    orgId={organization.id}
                    storeName={organization.name}
                    storeAvatar={organization.logo_url}
                    customTrigger={
                        <Button variant="outline" className="gap-2 font-medium w-full sm:w-auto">
                            <MessageCircle className="size-4" />
                            <span className="truncate">Chat</span>
                        </Button>
                    }
                />
            ) : (
                <Button variant="outline" className="gap-2 font-medium w-full sm:w-auto" asChild>
                    <Link href={`/login?next=/products/${organization.id}`}>
                        <MessageCircle className="size-4" />
                        Chat
                    </Link>
                </Button>
            )
        )}
        
        <Button variant="default" className="font-medium w-full sm:w-auto" asChild>
          <Link href={`/shop/${organization.slug}`}>Kunjungi</Link>
        </Button>
      </div>
    </div>
  )
}