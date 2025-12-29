import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Star } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton" // Import Skeleton

interface ProductCardProps {
  product: any
}

export function ProductCard({ product }: ProductCardProps) {
  // Hitung Rating
  const reviews = product.reviews || []
  const avgRating = reviews.length > 0 
    ? (reviews.reduce((acc: number, r: any) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : null

  // Cari harga terendah dari varian (jika ada override)
  const minPrice = product.product_variants?.reduce((min: number, v: any) => {
    const price = v.price_override || product.base_price
    return price < min ? price : min
  }, product.base_price) || product.base_price

  return (
    <Link href={`/products/${product.id}`} className="group block h-full select-none">
      <Card className="h-full border-border/40 shadow-none hover:border-primary/50 hover:shadow-md transition-all duration-300 flex flex-col bg-card/50 hover:bg-card overflow-hidden">
        
        {/* Image Container */}
        <div className="aspect-square relative bg-secondary/10">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name} 
              className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-500 ease-in-out"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground/40 text-xs">
              No Image
            </div>
          )}
          
          {/* Minimalist Store Badge */}
          <div className="absolute bottom-2 left-2 max-w-[calc(100%-1rem)]">
             <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm dark:bg-black/60 px-2 py-1 rounded-md shadow-sm border border-white/20">
                <Avatar className="h-3 w-3">
                  <AvatarImage src={product.organizations?.logo_url} />
                  <AvatarFallback className="text-[6px]">TK</AvatarFallback>
                </Avatar>
                <span className="truncate text-[10px] font-medium text-foreground/90">
                  {product.organizations?.name}
                </span>
             </div>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-3 flex-1 flex flex-col gap-1.5">
          <h3 className="font-medium text-sm leading-snug line-clamp-2 text-foreground/90 group-hover:text-primary transition-colors min-h-[2.5em]">
            {product.name}
          </h3>

          <div className="mt-auto space-y-1">
            <div className="text-base font-semibold text-primary tracking-tight">
               Rp {minPrice.toLocaleString("id-ID")}
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground h-4">
              {avgRating ? (
                <>
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium text-foreground">{avgRating}</span>
                  <span className="text-muted-foreground/60">({reviews.length})</span>
                </>
              ) : (
                <span className="text-muted-foreground/50">Belum ada ulasan</span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

// --- NEW SKELETON COMPONENT ---
export function ProductCardSkeleton() {
  return (
    <Card className="h-full border-border/40 shadow-none flex flex-col bg-card/50 overflow-hidden">
      {/* Image Skeleton */}
      <div className="aspect-square bg-secondary/20 relative">
        <Skeleton className="h-full w-full" />
      </div>

      {/* Content Skeleton */}
      <CardContent className="p-3 flex-1 flex flex-col gap-2">
        {/* Title Lines */}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />

        <div className="mt-auto space-y-2 pt-2">
          {/* Price */}
          <Skeleton className="h-5 w-1/2" />
          {/* Rating */}
          <Skeleton className="h-3 w-1/3" />
        </div>
      </CardContent>
    </Card>
  )
}