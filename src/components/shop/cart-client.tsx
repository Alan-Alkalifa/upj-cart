"use client"

import { useTransition } from "react"
import { removeCartItem, updateCartItemQuantity } from "./actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Loader2, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface CartClientProps {
  item: any
  isSelected: boolean
  onToggle: (checked: boolean) => void
}

export function CartClient({ item, isSelected, onToggle }: CartClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const product = item.product_variants.products
  const variant = item.product_variants
  const price = variant.price_override || product.base_price
  const stock = variant.stock || 0
  const quantity = item.quantity || 1

  const handleRemove = () => {
    startTransition(async () => {
      const res = await removeCartItem(item.id)
      if (res?.error) toast.error("Gagal menghapus", { description: res.error })
      else {
        toast.success("Item dihapus dari keranjang")
        router.refresh()
      }
    })
  }

  const handleUpdateQuantity = (newQty: number) => {
    if (newQty < 1 || newQty > stock) return;

    startTransition(async () => {
      const res = await updateCartItemQuantity(item.id, newQty)
      if (res?.error) {
        toast.error("Gagal update", { description: res.error })
      } else {
        router.refresh()
      }
    })
  }

  return (
    <div className="flex gap-4 p-4 sm:p-6 bg-card hover:bg-muted/5 transition-colors group items-start sm:items-center">
      
      {/* 1. CHECKBOX */}
      <Checkbox 
        checked={isSelected} 
        onCheckedChange={(checked) => onToggle(checked as boolean)}
        className="mt-1 sm:mt-0"
      />

      {/* 2. IMAGE */}
      <div className="h-20 w-20 sm:h-24 sm:w-24 bg-muted rounded-lg overflow-hidden border shrink-0 relative">
        {product.image_url ? (
          <img src={product.image_url} className="w-full h-full object-cover" alt={product.name} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">No Img</div>
        )}
      </div>
      
      {/* 3. DETAILS */}
      <div className="flex-1 flex flex-col justify-between min-h-[5rem] sm:min-h-[6rem]">
        <div className="space-y-1">
          <div className="flex justify-between items-start gap-2">
            <h4 className="font-medium text-sm sm:text-base line-clamp-2 leading-snug">{product.name}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded text-xs">
              Varian: {variant.name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Stok: <span className={stock < 5 ? "text-orange-600 font-bold" : ""}>{stock}</span>
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-3 gap-3">
          
          {/* Price & Subtotal Info */}
          <div className="flex flex-col">
            <div className="text-sm sm:text-base font-bold text-primary">
              Rp {price.toLocaleString("id-ID")}
            </div>
          </div>
          
          <div className="flex items-center gap-3 ml-auto sm:ml-0">
             {/* Quantity Controls */}
             <div className="flex items-center border rounded-md h-8 bg-background">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-full w-8 rounded-none rounded-l-md hover:bg-muted disabled:opacity-50"
                  disabled={isPending || quantity <= 1}
                  onClick={() => handleUpdateQuantity(quantity - 1)}
                >
                  <Minus className="h-3 w-3" />
                </Button>
                <div className="w-8 text-center text-sm font-medium tabular-nums">
                  {quantity}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-full w-8 rounded-none rounded-r-md hover:bg-muted disabled:opacity-50"
                  disabled={isPending || quantity >= stock}
                  onClick={() => handleUpdateQuantity(quantity + 1)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
             </div>

             {/* Delete Button */}
             <Button 
                variant="ghost" 
                size="icon" 
                className="text-muted-foreground hover:text-red-600 hover:bg-red-50 h-8 w-8"
                onClick={handleRemove}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                <span className="sr-only">Hapus</span>
              </Button>
          </div>

        </div>
      </div>
    </div>
  )
}