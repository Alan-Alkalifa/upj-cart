"use client"

import { Search, X, Store, Package, Loader2 } from "lucide-react" 
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { useDebouncedCallback } from "use-debounce"
import Link from "next/link"
import { getSearchPreview } from "@/app/(shop)/search/actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ShopSearchProps {
  baseUrl?: string;
  placeholder?: string;
  className?: string;
}

interface SearchResults {
  orgs: { id: string; name: string; slug: string; logo_url: string | null }[];
  products: { 
    id: string; 
    name: string; 
    image_url: string | null; 
    base_price: number;
    organizations: { slug: string, name: string }
  }[];
}

export function ShopSearch({ 
  baseUrl = "/search", 
  placeholder = "Cari produk atau toko...",
  className 
}: ShopSearchProps) {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace, push } = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  
  const initialQuery = searchParams.get('q') || ''
  const [searchTerm, setSearchTerm] = useState(initialQuery)
  
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<SearchResults>({ orgs: [], products: [] })

  useEffect(() => {
    const urlQ = searchParams.get('q') || ''
    if(urlQ !== searchTerm) {
       setSearchTerm(urlQ)
    }
  }, [searchParams]) 

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const debouncedSearch = useDebouncedCallback(async (value: string) => {
    if (value.length < 2) {
      setResults({ orgs: [], products: [] })
      return
    }

    setIsLoading(true)
    try {
      const data = await getSearchPreview(value)
      setResults({
        orgs: data.orgs || [],
        products: (data.products as any[]) || []
      })
    } catch (error) {
      console.error("Search error:", error)
    } finally {
      setIsLoading(false)
    }
  }, 300)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchTerm(value)
    
    if (value.length >= 2) {
      setIsOpen(true)
      debouncedSearch(value)
    } else {
      setIsOpen(false)
    }
  }

  const handleSearch = () => {
     setIsOpen(false)
     const params = new URLSearchParams()
     // Reset semua filter lain saat search baru
     if (searchTerm) params.set('q', searchTerm)
     
     if (pathname === baseUrl) {
       replace(`${baseUrl}?${params.toString()}`, { scroll: false })
     } else {
       push(`${baseUrl}?${params.toString()}`)
     }
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(price)
  }

  return (
    <div ref={containerRef} className={`relative w-full ${className || ''}`}>
      <div className="relative">
        <Input
          type="text"
          placeholder={placeholder}
          className="pl-4 h-11 bg-background rounded-full text-sm border shadow-sm focus-visible:ring-primary/20 transition-all pr-24"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => searchTerm.length >= 2 && setIsOpen(true)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-1" />
          ) : searchTerm && (
            <button 
              onClick={() => {
                setSearchTerm('')
                setIsOpen(false)
              }}
              className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          
          <Button 
            onClick={handleSearch} 
            size="icon" 
            className="h-8 w-8 rounded-full shadow-sm" 
            type="button"
          >
             <Search className="h-4 w-4" />
             <span className="sr-only">Cari</span>
          </Button>
        </div>
      </div>

      {isOpen && (results.orgs.length > 0 || results.products.length > 0) && (
        <div className="absolute top-full mt-2 w-full bg-background border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95">
          <div className="max-h-[60vh] overflow-y-auto py-2">
            
            {/* STORES SECTION */}
            {results.orgs.length > 0 && (
              <div className="mb-2">
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Store className="h-3 w-3" /> Toko
                </div>
                {results.orgs.map((org) => (
                  <Link 
                    key={org.id} 
                    // LINK INI MENGARAH KE PREVIEW CARD DI SEARCH PAGE
                    href={`/search?q=${searchTerm}&store_preview=${org.slug}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="h-8 w-8 border bg-white">
                      <AvatarImage src={org.logo_url || ""} />
                      <AvatarFallback className="text-[10px]">
                        {org.name.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium truncate text-foreground">{org.name}</span>
                  </Link>
                ))}
              </div>
            )}

            {results.orgs.length > 0 && results.products.length > 0 && (
              <div className="h-px bg-border mx-4 my-1" />
            )}

            {/* PRODUCTS SECTION */}
            {results.products.length > 0 && (
              <div>
                <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Package className="h-3 w-3" /> Produk
                </div>
                {results.products.map((product) => (
                  <Link 
                    key={product.id} 
                    // LINK INI MENGARAH KE PREVIEW CARD DI SEARCH PAGE
                    href={`/search?q=${searchTerm}&product_preview=${product.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-muted/50 transition-colors group"
                  >
                    <div className="h-10 w-10 rounded-md bg-muted overflow-hidden flex-shrink-0 border">
                      {product.image_url ? (
                        <img 
                          src={product.image_url} 
                          alt={product.name} 
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                          <Package className="h-4 w-4 opacity-50" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="text-sm font-medium truncate text-foreground">{product.name}</span>
                      <div className="flex items-center justify-between">
                         <span className="text-xs text-primary font-bold">
                           {formatPrice(product.base_price)}
                         </span>
                         {product.organizations && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">
                               {product.organizations.name}
                            </span>
                         )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            
            <div className="p-2 border-t mt-1">
               <Button 
                 variant="ghost" 
                 className="w-full text-xs h-9 text-muted-foreground font-normal hover:text-primary"
                 onClick={handleSearch}
               >
                 Lihat semua hasil untuk "{searchTerm}"
               </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}