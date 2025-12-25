"use client"

import { Search, X } from "lucide-react" // Tambah ikon X untuk clear manual
import { Input } from "@/components/ui/input"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { useDebounce } from "use-debounce"

export function ShopSearch() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  
  const initialQuery = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(initialQuery)
  const [query] = useDebounce(searchTerm, 300)

  // 1. Sinkronisasi dari URL ke Input (Hanya jika user navigasi Back/Forward atau klik tombol reset di luar)
  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    if (urlQ !== searchTerm) {
      setSearchTerm(urlQ)
    }
  }, [searchParams]) // Disederhanakan

  // 2. Sinkronisasi dari Debounced Query ke URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    const currentUrlQ = params.get('q') || ''

    // JANGAN update jika hasil debounce sama dengan apa yang ada di URL sekarang
    if (query === currentUrlQ) return

    if (query) {
      params.set('q', query)
    } else {
      params.delete('q')
    }
    
    replace(`${pathname}?${params.toString()}`, { scroll: false })
  }, [query, pathname, replace]) // Hapus searchTerm dari dependency di sini

return (
  <div className="relative w-full"> {/* Gunakan w-full agar fleksibel */}
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      type="text"
      placeholder="Cari produk..."
      className="pl-9 h-10 bg-background rounded-full text-sm border-2 focus-visible:ring-primary/20 transition-all"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />
      {searchTerm && (
        <button 
          onClick={() => setSearchTerm('')}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </div>
  )
}