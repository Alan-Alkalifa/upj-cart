"use client"

import { useSearchParams, usePathname, useRouter } from "next/navigation"
import { useTransition, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Search, Loader2 } from "lucide-react"

export function PayoutSearch() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [inputValue, setInputValue] = useState(searchParams.get('q')?.toString() || "")

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const params = new URLSearchParams(searchParams)
      
      params.set('page', '1') // Reset page saat mengetik
      
      if (inputValue) {
        params.set('q', inputValue)
      } else {
        params.delete('q')
      }

      if (params.get('q') !== searchParams.get('q')) {
        startTransition(() => {
          replace(`${pathname}?${params.toString()}`)
        })
      }
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [inputValue, pathname, replace, searchParams])

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
        placeholder="Cari merchant, bank, atau nama..."
        className="pl-9 w-full bg-background"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
    </div>
  )
}