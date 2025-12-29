"use client"

import { useState, useEffect } from "react"
import { ProductCard, ProductCardSkeleton } from "@/components/shop/product-card"
import { Button } from "@/components/ui/button"
import { Loader2, SearchX } from "lucide-react"
import { getMoreProducts } from "@/app/(shop)/search/actions"
import Link from "next/link"

interface ProductGridProps {
  initialProducts: any[]
  // UPDATED: Added merchant_id to the type definition
  searchParams: { 
    q?: string; 
    category?: string; 
    min?: string; 
    max?: string; 
    sort?: string;
    merchant_id?: string; 
  }
}

export function ProductGrid({ initialProducts, searchParams }: ProductGridProps) {
  const [products, setProducts] = useState(initialProducts)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialProducts.length === 12)

  // Reset state when filters change
  useEffect(() => {
    setProducts(initialProducts)
    setPage(1)
    setHasMore(initialProducts.length === 12)
  }, [initialProducts])

  const loadMore = async () => {
    setLoading(true)
    
    const nextPage = page + 1
    
    try {
      const newProducts = await getMoreProducts(nextPage, searchParams)
      
      if (newProducts.length < 12) {
        setHasMore(false)
      }
      
      setProducts((prev: any) => [...prev, ...newProducts])
      setPage(nextPage)
    } catch (error) {
      console.error("Failed to load more products", error)
    } finally {
      setLoading(false)
    }
  }

  if (products.length === 0 && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 md:py-32 bg-muted/10 rounded-3xl border-2 border-dashed border-muted animate-in fade-in zoom-in duration-500">
        <div className="bg-background p-6 rounded-full shadow-sm mb-4">
          <SearchX className="h-10 w-10 text-muted-foreground/50" />
        </div>
        <h3 className="font-bold text-lg md:text-xl text-foreground">Produk tidak ditemukan</h3>
        <p className="text-muted-foreground mb-8 text-sm max-w-62.5 md:max-w-xs text-center">
          Kami tidak menemukan hasil untuk kriteria pencarian Anda.
        </p>
        <Button asChild className="rounded-full px-8 shadow-lg shadow-primary/20">
          <Link href="/search">Reset Semua Filter</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* Product Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
        {products.map((product: any, index: number) => (
          <div key={`${product.id}-${index}`} className="animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both" style={{ animationDelay: `${index * 50}ms` }}>
            <ProductCard product={product} />
          </div>
        ))}

        {loading && (
          <>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="animate-in fade-in duration-300">
                <ProductCardSkeleton />
              </div>
            ))}
          </>
        )}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center pt-4">
          <Button 
            onClick={loadMore} 
            variant="outline" 
            size="lg" 
            className="rounded-full px-8 h-12 border-2 hover:bg-primary/5 hover:text-primary hover:border-primary/20 transition-all text-base font-semibold"
          >
            Muat Lebih Banyak
          </Button>
        </div>
      )}
      
      {loading && (
         <div className="flex justify-center pt-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
         </div>
      )}

      {!hasMore && products.length > 0 && (
        <div className="text-center py-8">
            <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                Anda telah mencapai akhir daftar
            </span>
        </div>
      )}
    </div>
  )
}