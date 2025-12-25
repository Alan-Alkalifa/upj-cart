"use client"

import { Button } from "@/components/ui/button"

export function JumpToProductsBtn() {
  return (
    <Button 
      variant="outline" 
      className="mt-6" 
      onClick={() => {
        // Cari element tab trigger dengan ID 'products-trigger' dan klik
        const trigger = document.getElementById('products-trigger')
        if (trigger) trigger.click()
      }}
    >
      Lihat Produk
    </Button>
  )
}