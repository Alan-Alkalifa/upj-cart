"use client"

import Link from "next/link"
import { Store, MapPin, ExternalLink, X, Package, Star, ShieldCheck, ShoppingBag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { useRouter, useSearchParams } from "next/navigation"
import { Separator } from "@/components/ui/separator"

interface SearchPreviewCardProps {
  type: 'store' | 'product'
  data: any
}

export function SearchPreviewCard({ type, data }: SearchPreviewCardProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleClose = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('store_preview')
    params.delete('product_preview')
    router.push(`/search?${params.toString()}`)
  }

  if (!data) return null

  // 1. TAMPILAN KARTU TOKO (Mirip Header Profil Toko)
  if (type === 'store') {
    return (
      <Card className="mb-8 border shadow-sm relative overflow-hidden group animate-in fade-in zoom-in-95 duration-300">
        {/* Close Button */}
        <div className="absolute top-3 right-3 z-20">
          <Button 
            variant="secondary" 
            size="icon" 
            className="h-8 w-8 rounded-full shadow-sm hover:bg-background/80 backdrop-blur-sm" 
            onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Banner Area - Konsisten dengan shop/[slug] */}
        {data.banner_url ? (
          <div className="h-32 md:h-40 w-full relative overflow-hidden bg-muted">
             <img 
               src={data.banner_url} 
               alt="Banner Toko" 
               className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
             />
             <div className="absolute inset-0 bg-black/10"></div>
          </div>
        ) : (
          <div className="h-32 md:h-40 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
             <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:16px_16px]"></div>
          </div>
        )}

        <CardContent className="px-6 pb-6 pt-0 relative">
          <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6">
            
            {/* Avatar - Overlap Banner (-mt-12) */}
            <div className="-mt-12 shrink-0 relative">
               <Avatar className="h-24 w-24 md:h-28 md:w-28 border-[4px] border-background shadow-lg bg-white rounded-2xl">
                 <AvatarImage src={data.logo_url} className="object-cover rounded-xl" />
                 <AvatarFallback className="text-3xl font-bold bg-primary/5 text-primary rounded-xl">
                   {data.name.substring(0, 2).toUpperCase()}
                 </AvatarFallback>
               </Avatar>
               {/* Badge Verified (Optional) */}
               <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white p-1 rounded-full border-[3px] border-background shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5" />
               </div>
            </div>

            {/* Info Section */}
            <div className="flex-1 space-y-3 pt-2 md:pt-4 w-full text-center md:text-left">
               <div>
                  <div className="flex items-center justify-center md:justify-start gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-blue-200 bg-blue-50 text-blue-700">
                      Toko Terpilih
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">{data.name}</h2>
                  
                  {data.address_city && (
                    <div className="flex items-center justify-center md:justify-start gap-1.5 text-sm text-muted-foreground mt-1">
                      <MapPin className="h-3.5 w-3.5" /> 
                      <span>{data.address_city}</span>
                    </div>
                  )}
               </div>

               <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                 {data.description || "Toko mahasiswa Universitas Pembangunan Jaya."}
               </p>

               {/* Stats (Opsional jika data tersedia) */}
               <div className="flex items-center justify-center md:justify-start gap-4 text-xs font-medium text-muted-foreground pt-1">
                 <div className="flex items-center gap-1">
                   <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                   <span>4.8 Rating</span>
                 </div>
                 <Separator orientation="vertical" className="h-3" />
                 <div className="flex items-center gap-1">
                   <ShoppingBag className="h-3.5 w-3.5" />
                   <span>Produk Tersedia</span>
                 </div>
               </div>
            </div>

            {/* Action Button */}
            <div className="w-full md:w-auto mt-2 md:mt-4 shrink-0">
               <Button asChild size="default" className="w-full md:w-auto gap-2 shadow-sm rounded-full">
                 <Link href={`/shop/${data.slug}`}>
                   Kunjungi Toko <ExternalLink className="h-4 w-4" />
                 </Link>
               </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 2. TAMPILAN KARTU PRODUK (Mirip Halaman Detail Produk)
  if (type === 'product') {
     const formattedPrice = new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
      }).format(data.base_price)

    return (
      <Card className="mb-8 border shadow-sm relative overflow-hidden group animate-in fade-in zoom-in-95 duration-300">
        <div className="absolute top-3 right-3 z-20">
          <Button 
             variant="ghost" 
             size="icon" 
             className="h-8 w-8 rounded-full bg-background/50 hover:bg-background shadow-sm backdrop-blur-sm" 
             onClick={handleClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <CardContent className="p-0 flex flex-col md:flex-row">
          {/* Gambar Produk - Responsive Grid */}
          <div className="w-full md:w-64 h-64 md:h-auto bg-muted shrink-0 relative border-b md:border-b-0 md:border-r overflow-hidden">
             {data.image_url ? (
               <img 
                 src={data.image_url} 
                 alt={data.name} 
                 className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
               />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 gap-2">
                 <Package className="h-10 w-10" />
                 <span className="text-xs">No Image</span>
               </div>
             )}
             
             {/* Overlay Badge */}
             <div className="absolute top-3 left-3">
               <Badge variant="secondary" className="backdrop-blur-md bg-white/80 text-foreground font-semibold shadow-sm">
                 Produk Pilihan
               </Badge>
             </div>
          </div>

          <div className="p-6 flex flex-col justify-center flex-1 space-y-4">
             {/* Header Info */}
             <div>
                {data.organizations && (
                  <Link 
                    href={`/search?q=${searchParams.get('q') || ''}&store_preview=${data.organizations.slug}`} 
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mb-2"
                  >
                     <Store className="h-3.5 w-3.5" /> 
                     <span className="font-medium">{data.organizations.name}</span>
                  </Link>
                )}
                
                <h2 className="text-xl md:text-2xl font-bold leading-tight text-foreground">{data.name}</h2>
                
                {/* Rating (Placeholder jika belum ada data rating di preview) */}
                <div className="flex items-center gap-2 mt-2">
                   <div className="flex text-yellow-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5 fill-current" />
                      ))}
                   </div>
                   <span className="text-xs text-muted-foreground">(Lihat Detail)</span>
                </div>
             </div>

             {/* Price */}
             <div className="py-2">
               <span className="text-3xl font-black tracking-tight text-primary">
                 {formattedPrice}
               </span>
             </div>
             
             {/* Description Truncated */}
             <p className="text-sm text-muted-foreground line-clamp-2 md:line-clamp-3 leading-relaxed max-w-2xl">
               {data.description || "Tidak ada deskripsi produk untuk saat ini. Silakan lihat detail lengkap untuk informasi lebih lanjut."}
             </p>

             {/* Action Buttons */}
             <div className="flex items-center gap-3 pt-2">
               <Button asChild size="lg" className="rounded-full px-8 shadow-sm">
                 <Link href={`/products/${data.id}`}>
                   Lihat Detail Lengkap
                 </Link>
               </Button>
               {/* Opsional: Tombol Chat/Keranjang Cepat */}
             </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}