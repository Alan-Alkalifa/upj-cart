"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation" // Tambahkan usePathname
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function ProductSort() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname() // Ambil path saat ini

  const currentSort = searchParams.get("sort") || "newest"

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", value)
    
    // Reset pagination saat sorting berubah agar user tidak bingung
    params.delete("page") 

    // Gunakan pathname dinamis
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium hidden sm:inline text-nowrap">
        Urutkan:
      </span>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="h-9 w-[160px] text-xs bg-background">
          <SelectValue placeholder="Urutkan..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest" className="text-xs">Terbaru</SelectItem>
          <SelectItem value="price_asc" className="text-xs">Harga: Rendah - Tinggi</SelectItem>
          <SelectItem value="price_desc" className="text-xs">Harga: Tinggi - Rendah</SelectItem>
          <SelectItem value="name_asc" className="text-xs">Nama: A - Z</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}