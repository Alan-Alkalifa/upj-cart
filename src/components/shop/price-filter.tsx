"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Slider } from "@/components/ui/slider" // Menggunakan komponen Slider
import { Input } from "@/components/ui/input" // Menggunakan komponen Input
import { Label } from "@/components/ui/label" // Menggunakan komponen Label
import { Button } from "@/components/ui/button" // Menggunakan komponen Button
import { X } from "lucide-react"

export function PriceFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Konfigurasi batas harga (Sesuaikan dengan kebutuhan katalog Anda)
  const MIN_LIMIT = 0
  const MAX_LIMIT = 10000000 // Contoh: 10 Juta

  // State internal untuk Slider (selalu berupa array angka)
  const [range, setRange] = useState<number[]>([
    Number(searchParams.get("min")) || MIN_LIMIT,
    Number(searchParams.get("max")) || MAX_LIMIT
  ])

  // Sinkronisasi state saat URL berubah (misal tombol reset ditekan)
  useEffect(() => {
    setRange([
      Number(searchParams.get("min")) || MIN_LIMIT,
      Number(searchParams.get("max")) || MAX_LIMIT
    ])
  }, [searchParams])

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Set min jika lebih besar dari batas bawah
    if (range[0] > MIN_LIMIT) params.set("min", range[0].toString())
    else params.delete("min")
    
    // Set max jika lebih kecil dari batas atas
    if (range[1] < MAX_LIMIT) params.set("max", range[1].toString())
    else params.delete("max")

    router.push(`/search?${params.toString()}`)
  }

  const resetPrice = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("min")
    params.delete("max")
    setRange([MIN_LIMIT, MAX_LIMIT])
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Label className="font-bold text-sm tracking-tight">Rentang Harga</Label>
        {(searchParams.get("min") || searchParams.get("max")) && (
          <button 
            onClick={resetPrice}
            className="text-[10px] text-destructive hover:underline flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Hapus
          </button>
        )}
      </div>
      
      <div className="px-2">
        {/* Implementasi Slider */}
        <Slider
          defaultValue={[MIN_LIMIT, MAX_LIMIT]}
          value={range}
          min={MIN_LIMIT}
          max={MAX_LIMIT}
          step={50000} // Kelipatan 50rb
          onValueChange={(value) => setRange(value)}
          className="py-4"
        />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {/* Input Harga Minimum */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground ml-1">Minimum</span>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-muted-foreground">Rp</span>
              <Input 
                type="number" 
                className="pl-8 h-9 text-xs" 
                value={range[0]}
                onChange={(e) => setRange([Number(e.target.value), range[1]])}
              />
            </div>
          </div>
          {/* Input Harga Maksimum */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground ml-1">Maksimum</span>
            <div className="relative">
              <span className="absolute left-2.5 top-2.5 text-[10px] font-bold text-muted-foreground">Rp</span>
              <Input 
                type="number" 
                className="pl-8 h-9 text-xs" 
                value={range[1]}
                onChange={(e) => setRange([range[0], Number(e.target.value)])}
              />
            </div>
          </div>
        </div>
        
        <Button 
          onClick={applyFilter} 
          className="w-full h-8 text-xs font-semibold" 
          variant="secondary" // Konsisten dengan design sebelumnya
        >
          Terapkan Harga
        </Button>
      </div>
    </div>
  )
}