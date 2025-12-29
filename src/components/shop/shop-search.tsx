"use client"

import { Search, X } from "lucide-react" 
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

// Menambahkan props baseUrl agar bisa dinamis
interface ShopSearchProps {
  baseUrl?: string;
  placeholder?: string;
  className?: string;
}

export function ShopSearch({ 
  baseUrl = "/search", // Default ke global search
  placeholder = "Cari produk mahasiswa...",
  className 
}: ShopSearchProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace, push } = useRouter()
  
  const initialQuery = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(initialQuery)

  // 1. Sync URL -> Input
  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    if(urlQ !== searchTerm) {
       setSearchTerm(urlQ)
    }
  }, [searchParams]) 

  // 2. Manual Search Handler
  const handleSearch = () => {
     const params = new URLSearchParams(searchParams)
     
     if (searchTerm) {
       params.set('q', searchTerm)
     } else {
       params.delete('q')
     }
     
     // Logika Navigasi:
     if (pathname === baseUrl) {
       replace(`${baseUrl}?${params.toString()}`, { scroll: false })
     } else {
       push(`${baseUrl}?${params.toString()}`)
     }
  }

  return (
    <div className={`relative w-full ${className || ''}`}>
      <Input
        type="text"
        placeholder={placeholder}
        className="pl-3 h-10 bg-background rounded-full text-sm border-2 focus-visible:ring-primary/20 transition-all pr-20"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
      />
      
      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm('')}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            type="button"
            title="Hapus pencarian"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        
        <Button 
          onClick={handleSearch} 
          size="icon" 
          variant="ghost" // Membuat background transparan (bg-none)
          className="h-7 w-7 rounded-full shadow-sm hover:bg-muted" 
          type="button"
        >
           <Search className="h-4 w-4 text-muted-foreground pointer-events-none" />
           <span className="sr-only">Cari</span>
        </Button>
      </div>
    </div>
  )
}