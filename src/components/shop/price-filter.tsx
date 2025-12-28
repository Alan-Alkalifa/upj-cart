"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation" // Tambahkan usePathname
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

export function PriceFilter() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname() // Ambil path saat ini (bisa /search atau /shop/slug)

  const MIN_LIMIT = 0
  const MAX_LIMIT = 10000000 

  const [range, setRange] = useState<number[]>([
    Number(searchParams.get("min")) || MIN_LIMIT,
    Number(searchParams.get("max")) || MAX_LIMIT
  ])

  useEffect(() => {
    setRange([
      Number(searchParams.get("min")) || MIN_LIMIT,
      Number(searchParams.get("max")) || MAX_LIMIT
    ])
  }, [searchParams])

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Reset pagination ke page 1 saat filter berubah
    params.delete("page")

    if (range[0] > MIN_LIMIT) params.set("min", range[0].toString())
    else params.delete("min")
    
    if (range[1] < MAX_LIMIT) params.set("max", range[1].toString())
    else params.delete("max")

    // Gunakan pathname dinamis
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const resetPrice = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete("min")
    params.delete("max")
    params.delete("page")
    setRange([MIN_LIMIT, MAX_LIMIT])
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
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
        <Slider
          defaultValue={[MIN_LIMIT, MAX_LIMIT]}
          value={range}
          min={MIN_LIMIT}
          max={MAX_LIMIT}
          step={50000}
          onValueChange={(value) => setRange(value)}
          className="py-4"
        />
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
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
          variant="secondary"
        >
          Terapkan Harga
        </Button>
      </div>
    </div>
  )
}