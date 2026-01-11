"use client"

import * as React from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CalendarDays } from "lucide-react"

export function MonthFilter() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const { replace } = useRouter()

  // 1. Dapatkan string YYYY-MM untuk bulan saat ini (Local Time)
  const currentMonthValue = React.useMemo(() => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    return `${year}-${month}`
  }, [])

  // 2. Generate 12 bulan terakhir untuk opsi
  const months = React.useMemo(() => {
    const options = []
    const today = new Date()
    for (let i = 0; i < 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const value = d.toISOString().slice(0, 7)
      const label = d.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
      options.push({ value, label })
    }
    return options
  }, [])

  // 3. Default value adalah currentMonthValue jika param kosong
  // Jika user pilih "Semua", param bernilai "all"
  const currentFilter = searchParams.get("month") || currentMonthValue

  const handleFilterChange = (val: string) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", "1")
    
    // Jika user memilih "Semua Waktu", kita set "all" secara eksplisit
    // Agar page.tsx tahu user ingin mematikan filter default bulan ini
    if (val === "all") {
      params.set("month", "all")
    } else {
      params.set("month", val)
    }
    
    replace(`${pathname}?${params.toString()}`)
  }

  return (
    <Select value={currentFilter} onValueChange={handleFilterChange}>
      <SelectTrigger className="w-[180px] bg-background">
        <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Pilih Bulan" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Semua Waktu</SelectItem>
        {months.map((m) => (
          <SelectItem key={m.value} value={m.value}>
            {m.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}