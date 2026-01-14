// src/app/(dashboard)/merchant-dashboard/orders/order-search.tsx
"use client"

import { Input } from "@/components/ui/input"
import { useRouter, useSearchParams } from "next/navigation"
import { useDebouncedCallback } from "use-debounce"
import { Search } from "lucide-react"

export function OrderSearch() {
  const searchParams = useSearchParams()
  const { replace } = useRouter()

  const handleSearch = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", "1") // Reset to page 1 on search
    
    if (term) {
      params.set("q", term)
    } else {
      params.delete("q")
    }
    
    replace(`/merchant-dashboard/orders?${params.toString()}`)
  }, 300)

  return (
    <div className="relative w-full md:w-[300px]">
      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
      <Input
        type="search"
        placeholder="Cari Order ID atau Resi..."
        className="pl-9 bg-background"
        defaultValue={searchParams.get("q")?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
      />
    </div>
  )
}