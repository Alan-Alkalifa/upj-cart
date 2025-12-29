"use client"

import { Button } from "@/components/ui/button"
import { useShopTabs } from "./shop-tabs-wrapper"

export function JumpToProductsBtn() {
  const { setActiveTab } = useShopTabs()
  
  return (
    <Button 
      variant="outline" 
      className="mt-6" 
      onClick={() => {
        // 1. Ubah state tab ke 'products' via Context
        setActiveTab("products")
        
        // 2. Scroll smooth ke atas agar user melihat tab yang aktif
        // Kita beri sedikit timeout agar render tab selesai sebelum scroll (opsional, tapi aman)
        setTimeout(() => {
          document.getElementById("products-trigger")?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }}
    >
      Lihat Produk
    </Button>
  )
}