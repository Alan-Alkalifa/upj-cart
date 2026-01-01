"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Store, MapPin, ExternalLink, X, Star, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useRouter, useSearchParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { ProductImageCarousel } from "@/components/shop/product-image-carousel"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton" // Import Skeleton

import { createClient } from "@/utils/supabase/client"
import { ShareButton } from "@/components/shop/share-button"

interface SearchPreviewCardProps {
  type: 'store' | 'product'
  data: any
}

export function SearchPreviewCard({ type, data }: SearchPreviewCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // State untuk Auth Logic
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)

  // Fetch User Status pada Mount
  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
        setUserRole(data?.role)
      }
      setLoadingAuth(false)
    }
    fetchUser()
  }, [])

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('store_preview')
    params.delete('product_preview')
    router.push(`/search?${params.toString()}`)
  }

  if (!data) return null

  // Cek apakah user restricted (Merchant/Admin tidak bisa chat sebagai pembeli)
  const isRestricted = userRole === 'merchant' || userRole === 'super_admin'

  // Siapkan Data URL untuk Share
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const shareUrl = type === 'store' 
    ? `${origin}/merchant/${data.slug}`
    : `${origin}/products/${data.id}`

  // Siapkan Data untuk Chat
  const orgData = type === 'store' ? data : data.organizations
  const showChatButton = !isRestricted && orgData

  // --- 1. TAMPILAN KARTU TOKO ---
  if (type === 'store') {
    return (
      <Card className="mb-6 border shadow-sm relative overflow-hidden group animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-2 right-2 z-20">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-7 w-7  shadow-sm hover:bg-background/80 backdrop-blur-sm" 
            onClick={handleClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Banner Area */}
        {data.banner_url ? (
          <div className="h-28 md:h-36 w-full relative overflow-hidden bg-muted">
             <img 
               src={data.banner_url} 
               alt="Banner Toko" 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
             />
             <div className="absolute inset-0 bg-black/10"></div>
          </div>
        ) : (
          <div className="h-28 md:h-36 w-full bg-linear-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] bg-size-[16px_16px]"></div>
          </div>
        )}

        <CardContent className="px-5 pb-5 pt-0 relative">
          <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-5">
            
            {/* Avatar */}
            <div className="-mt-10 shrink-0 relative">
               <Avatar className="h-20 w-20 md:h-24 md:w-24 border-4 border-background shadow-lg bg-white rounded-2xl">
                 <AvatarImage src={data.logo_url} className="object-cover rounded-xl" />
                 <AvatarFallback className="text-2xl font-bold bg-primary/5 text-primary rounded-xl">
                   {data.name?.substring(0, 2).toUpperCase()}
                 </AvatarFallback>
               </Avatar>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-2 pt-1 lg:pt-3 w-full text-left">
               <div>
                  <div className="flex items-center justify-start gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-blue-200 bg-blue-50 text-blue-700">
                      Official Store
                    </Badge>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{data.name}</h2>
                  
                  {data.address_city && (
                    <div className="flex items-center justify-start gap-1.5 text-xs md:text-sm text-muted-foreground mt-0.5">
                      <MapPin className="h-3.5 w-3.5" /> 
                      <span>{data.address_city}</span>
                    </div>
                  )}
               </div>

               <p className="text-sm text-muted-foreground line-clamp-1 leading-relaxed max-w-xl">
                 {data.description || "Toko Civitas Universitas Pembangunan Jaya."}
               </p>
            </div>

            {/* Action Buttons */}
            <div className="w-full lg:w-auto mt-2 lg:mt-3 shrink-0 flex flex-wrap justify-start lg:justify-end gap-2">

               {/* Share Button */}
               <ShareButton url={shareUrl} title={data.name} />

               <Button asChild size="sm" variant="default" className=" h-9 px-5 gap-2 shadow-sm">
                 <Link href={`/merchant/${data.slug}`}>
                   Kunjungi
                 </Link>
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // --- 2. TAMPILAN KARTU PRODUK ---
  if (type === 'product') {
     const images = [
        data.image_url, 
        ...(data.product_images?.map((img: any) => img.image_url) || [])
     ].filter(Boolean)

     const reviews = data.reviews || []
     const avgRating = reviews.length > 0 
       ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
       : null

     const minPrice = data.product_variants?.reduce((min: number, v: any) => {
       const price = v.price_override || data.base_price
       return price < min ? price : min
     }, data.base_price) || data.base_price

     const formattedPrice = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(minPrice)

    return (
      <Card className="mb-6 border shadow-sm relative overflow-hidden group animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-2 right-2 z-20">
          <Button 
             variant="ghost" 
             size="icon" 
             className="h-7 w-7  bg-background/50 hover:bg-background shadow-sm backdrop-blur-sm border border-transparent hover:border-border" 
             onClick={handleClose}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <CardContent className="p-4 flex flex-col md:flex-row gap-5 items-start">
          
          <div className="w-full md:w-55 shrink-0 relative">
             <ProductImageCarousel images={images} productName={data.name} />
             <div className="absolute top-2 left-2 z-10 pointer-events-none">
               <Badge variant="secondary" className="backdrop-blur-md bg-white/90 dark:bg-black/60 shadow-sm border-white/20 text-[10px] px-1.5 h-5">
                 Preview
               </Badge>
             </div>
          </div>

          <div className="flex-1 space-y-2.5 w-full text-left min-w-0">
             <div>
                {data.organizations && (
                  <Link 
                    href={`/search?q=${searchParams.get('q') || ''}&store_preview=${data.organizations.slug}`} 
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-1.5 justify-start"
                  >
                     <Store className="h-3 w-3" /> 
                     <span className="font-medium">{data.organizations.name}</span>
                  </Link>
                )}
                
                <h2 className="text-xl md:text-2xl font-bold leading-tight text-foreground tracking-tight line-clamp-2">
                  {data.name}
                </h2>
                
                <div className="flex items-center gap-2 mt-1.5 justify-start">
                   <div className="flex items-center gap-1">
                      <Star className={cn("h-3.5 w-3.5", avgRating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")} />
                      <span className="font-medium text-sm">
                        {avgRating ? avgRating : "Belum ada ulasan"}
                      </span>
                   </div>
                   {avgRating && (
                     <>
                       <Separator orientation="vertical" className="h-3" />
                       <span className="text-xs text-muted-foreground">{reviews.length} Ulasan</span>
                     </>
                   )}
                </div>
             </div>

             <Separator className="opacity-50 my-1" />

             <div>
               <span className="text-2xl md:text-3xl font-black tracking-tight text-primary">
                 {formattedPrice}
               </span>
             </div>
             
             <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
               {data.description || "Tidak ada deskripsi produk untuk saat ini."}
             </p>

             <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-start w-full">
               <Button asChild size="default" className=" px-6 shadow-sm w-full sm:w-auto h-9">
                 <Link href={`/products/${data.id}`}>
                   Lihat Detail
                 </Link>
               </Button>
               
               <div className="flex items-center gap-2">
                 <ShareButton url={shareUrl} title={data.name} />
               </div>
             </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}

// --------------------------------------------------------
// SEARCH PREVIEW SKELETON
// Gunakan komponen ini saat data sedang dimuat
// --------------------------------------------------------
export function SearchPreviewSkeleton({ type = 'product' }: { type?: 'store' | 'product' }) {
  
  // 1. STORE SKELETON
  if (type === 'store') {
    return (
      <Card className="mb-6 border shadow-sm relative overflow-hidden">
        {/* Banner Skeleton */}
        <Skeleton className="h-28 md:h-36 w-full rounded-none" />

        <CardContent className="px-5 pb-5 pt-0 relative">
          <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-5">
            
            {/* Avatar Skeleton */}
            <div className="-mt-10 shrink-0 relative">
               <Skeleton className="h-20 w-20 md:h-24 md:w-24 rounded-2xl border-4 border-background bg-muted" />
            </div>

            {/* Info Skeleton */}
            <div className="flex-1 space-y-2.5 pt-1 lg:pt-3 w-full">
               <Skeleton className="h-5 w-24 " />
               <Skeleton className="h-7 w-48 md:w-64" />
               <Skeleton className="h-4 w-32" />
               <Skeleton className="h-4 w-full max-w-md mt-1" />
            </div>

            {/* Action Buttons Skeleton */}
            <div className="w-full lg:w-auto mt-2 lg:mt-3 shrink-0 flex gap-2">
               <Skeleton className="h-9 w-24 " />
               <Skeleton className="h-9 w-9 " />
               <Skeleton className="h-9 w-28 " />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 2. PRODUCT SKELETON
  return (
    <Card className="mb-6 border shadow-sm relative overflow-hidden">
      <CardContent className="p-4 flex flex-col md:flex-row gap-5 items-start">
        
        {/* Image Carousel Skeleton */}
        <div className="w-full md:w-55 shrink-0">
           <Skeleton className="aspect-square w-full rounded-xl" />
        </div>

        {/* Details Skeleton */}
        <div className="flex-1 space-y-4 w-full min-w-0 pt-1">
           <div className="space-y-2">
              <Skeleton className="h-4 w-32" /> {/* Store Name */}
              <Skeleton className="h-6 md:h-8 w-3/4" /> {/* Product Name */}
              <Skeleton className="h-4 w-24" /> {/* Rating */}
           </div>

           <Separator className="opacity-50" />

           <div>
             <Skeleton className="h-8 w-40" /> {/* Price */}
           </div>
           
           <div className="space-y-1.5">
             <Skeleton className="h-3 w-full" />
             <Skeleton className="h-3 w-5/6" />
           </div>

           <div className="pt-2 flex gap-2">
             <Skeleton className="h-9 w-32 " /> {/* Main Button */}
             <Skeleton className="h-9 w-9 " /> {/* Chat/Share */}
             <Skeleton className="h-9 w-9 " />
           </div>
        </div>
      </CardContent>
    </Card>
  )
}