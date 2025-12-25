"use client"

import { useState, useTransition } from "react"
import { removeCartItem } from "./actions"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Loader2 } from "lucide-react"
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
          <h4 className="font-medium text-sm sm:text-base line-clamp-2 leading-snug">{product.name}</h4>
          <p className="text-sm text-muted-foreground bg-muted w-fit px-2 py-0.5 rounded text-xs">
            Varian: {variant.name}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mt-2 gap-3">
          <div className="flex flex-col">
            <div className="text-sm sm:text-base font-bold text-primary">
              Rp {price.toLocaleString("id-ID")} 
              <span className="text-muted-foreground font-normal text-xs ml-1">x {item.quantity}</span>
            </div>
          </div>
          
          {/* TOMBOL HAPUS (Dibuat Visible) */}
          <Button 
            variant="outline" 
            size="sm" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 h-8 px-3 ml-auto sm:ml-0 gap-2"
            onClick={handleRemove}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            <span className="text-xs">Hapus</span>
          </Button>
        </div>
      </div>
    </div>
  )
}