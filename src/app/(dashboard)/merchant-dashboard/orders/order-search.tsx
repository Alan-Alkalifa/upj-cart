"use client"

import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"

export function OrderSearch() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleSearch(term: string) {
    const params = new URLSearchParams(searchParams)
    
    // Reset pagination ke halaman 1 saat mencari
    params.set('page', '1')
    
    if (term) {
      params.set('q', term)
    } else {
      params.delete('q')
    }

    startTransition(() => {
      replace(`${pathname}?${params.toString()}`)
    })
  }

  return (
    <div className="relative w-full md:w-[300px]">
      <div className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Search className="h-4 w-4" />
        )}
      </div>
      <Input
        type="search"
        placeholder="Cari Order ID atau Nama Pembeli..."
        className="pl-9 w-full bg-background"
        defaultValue={searchParams.get('q')?.toString()}
        onChange={(e) => {
          const value = e.target.value
          const timeoutId = setTimeout(() => handleSearch(value), 300)
          return () => clearTimeout(timeoutId)
        }}
      />
    </div>
  )
}