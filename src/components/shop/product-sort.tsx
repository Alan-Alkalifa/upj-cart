"use client"

import { useRouter, useSearchParams } from "next/navigation"
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

  // Default ke "newest" jika tidak ada parameter sort
  const currentSort = searchParams.get("sort") || "newest"

  const handleSortChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("sort", value)
    
    // Reset pagination ke halaman 1 jika ada sorting baru (opsional, jika nanti ada pagination)
    // params.delete("page") 

    router.push(`/search?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground font-medium hidden sm:inline text-nowrap">
        Urutkan:
      </span>
      <Select value={currentSort} onValueChange={handleSortChange}>
        <SelectTrigger className="h-9 w-[160px] text-xs">
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