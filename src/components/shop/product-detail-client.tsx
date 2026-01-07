"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { ShoppingCart, Minus, Plus, Loader2, CheckCircle2, Ban } from "lucide-react"
import { addToCart } from "./actions"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
// [ANALYTICS] Import Helper
import { trackEvent } from "@/lib/analytics"

// --- FIX: Perbarui interface untuk menerima prop 'user' ---
interface ProductDetailClientProps {
  product: any;
  user: any; // Menerima data user dari Server Component
  isRestricted?: boolean;
}

export function ProductDetailClient({ 
  product, 
  user, // Destructure prop user di sini
  isRestricted = false 
}: ProductDetailClientProps) {
  const router = useRouter()
  
  // Cari varian default yang stoknya tersedia
  const defaultVariant = product.product_variants.find((v: any) => v.stock > 0)
  
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(defaultVariant?.id)
  const [quantity, setQuantity] = useState(1)
  const [isPending, setIsPending] = useState(false)

  const selectedVariant = product.product_variants.find((v: any) => v.id === selectedVariantId)
  
  const displayPrice = selectedVariant?.price_override || product.base_price
  const maxStock = selectedVariant?.stock || 0
  const isOutOfStock = maxStock === 0

  // Efek visual saat harga berubah
  const [priceKey, setPriceKey] = useState(0)
  useEffect(() => {
    setPriceKey(prev => prev + 1)
  }, [displayPrice])

  // [ANALYTICS] 1. Track View Item saat komponen di-mount
  useEffect(() => {
    if (product) {
      trackEvent.viewItem(product)
    }
  }, [product])

  const handleAddToCart = async () => {
    // Gunakan data user untuk pengecekan awal sebelum hit server
    if (!user) {
      toast.error("Anda belum login", { description: "Silakan login untuk mulai berbelanja." })
      return router.push("/login")
    }

    if (isRestricted) return; 
    if (!selectedVariantId) return toast.error("Silakan pilih varian terlebih dahulu")
    if (quantity > maxStock) return toast.error("Stok tidak mencukupi")

    setIsPending(true)
    
    const result = await addToCart(selectedVariantId, quantity)
    setIsPending(false)

    if (result.error) {
      if (result.error === "Unauthorized") {
        toast.error("Anda belum login", { description: "Silakan login untuk mulai berbelanja." })
        router.push("/login")
      } else {
        toast.error("Gagal menambahkan", { description: result.error })
      }
    } else {
      toast.success("Berhasil!", { description: `${product.name} (${quantity}x) masuk keranjang.` })
      
      // [ANALYTICS] 2. Track Add To Cart Sukses
      trackEvent.addToCart({
        product: product,
        variantName: selectedVariant?.name || "Default",
        quantity: quantity,
        finalPrice: displayPrice
      })

      router.refresh()
    }
  }

  return (
    <div className="space-y-8 bg-card rounded-xl">
      
      {/* 1. PRICE DISPLAY */}
      <div className="space-y-1">
        <div key={priceKey} className="text-4xl font-bold text-primary animate-in fade-in slide-in-from-left-2 duration-300">
          Rp {displayPrice.toLocaleString("id-ID")}
        </div>
        {selectedVariant && selectedVariant.price_override > 0 && selectedVariant.price_override < product.base_price && (
           <div className="flex items-center gap-2">
             <div className="text-muted-foreground text-sm line-through decoration-red-500/50 decoration-2">
               Rp {product.base_price.toLocaleString("id-ID")}
             </div>
             <div className="text-xs font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">
               Hemat Rp {(product.base_price - selectedVariant.price_override).toLocaleString("id-ID")}
             </div>
           </div>
        )}
      </div>

      {/* 2. VARIANTS SELECTION */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-foreground">Pilih Varian</label>
          <span className={cn("text-xs font-medium", maxStock < 5 ? "text-orange-600" : "text-muted-foreground")}>
            {selectedVariant ? `Stok: ${maxStock} unit` : "Pilih varian"}
          </span>
        </div>
        
        <div className="flex flex-wrap gap-3">
          {product.product_variants.map((variant: any) => {
            const isSelected = selectedVariantId === variant.id
            const isHabis = variant.stock === 0
            
            return (
              <button
                key={variant.id}
                type="button"
                onClick={() => {
                  if(!isHabis) {
                    setSelectedVariantId(variant.id)
                    setQuantity(1)
                  }
                }}
                disabled={isHabis}
                className={cn(
                  "relative px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all duration-200 outline-none focus:ring-2 focus:ring-primary/20",
                  isSelected 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-muted bg-background hover:border-primary/50 text-foreground",
                  isHabis && "opacity-50 cursor-not-allowed bg-muted border-transparent text-muted-foreground decoration-slate-400"
                )}
              >
                {variant.name}
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-primary text-white rounded-full p-0.5 shadow-sm">
                    <CheckCircle2 className="h-3 w-3" />
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 3. QUANTITY & ACTION */}
      <div className="pt-6 border-t border-dashed space-y-4">
        <div className="flex items-center gap-4">
            
            {/* Quantity Input */}
            <div className={cn("flex items-center border-2 border-muted rounded-lg p-1 shrink-0", isRestricted && "opacity-50 pointer-events-none")}>
              <Button 
                variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-muted"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1 || isOutOfStock}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <div className="w-12 text-center text-sm font-bold tabular-nums">{quantity}</div>
              <Button 
                variant="ghost" size="icon" className="h-9 w-9 rounded-md hover:bg-muted"
                onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}
                disabled={quantity >= maxStock || isOutOfStock}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="text-sm text-muted-foreground hidden sm:block">
              Subtotal: <span className="font-bold text-foreground">Rp {(displayPrice * quantity).toLocaleString("id-ID")}</span>
            </div>
        </div>

        <Button 
          size="lg" 
          className="w-full text-base font-bold shadow-lg shadow-primary/20 h-12"
          disabled={isOutOfStock || !selectedVariantId || isPending || isRestricted}
          onClick={handleAddToCart}
        >
          {isPending ? (
            <Loader2 className="animate-spin mr-2 h-5 w-5" />
          ) : isRestricted ? (
            <Ban className="mr-2 h-5 w-5" />
          ) : (
            <ShoppingCart className="mr-2 h-5 w-5" />
          )}
          
          {isRestricted 
            ? "Akun Merchant/Admin Tidak Bisa Beli" 
            : isOutOfStock 
              ? "Stok Habis" 
              : "Masukkan Keranjang"
          }
        </Button>
      </div>
    </div>
  )
}