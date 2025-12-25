"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface ExportButtonProps {
  data: any[]
  filename?: string
  label?: string
}

export function ExportButton({ data, filename = "data", label = "Export CSV" }: ExportButtonProps) {
  
  const handleExport = () => {
    if (!data || data.length === 0) {
      alert("Tidak ada data untuk diexport")
      return
    }

    // 1. Extract Headers
    const headers = Object.keys(data[0])
    
    // 2. Convert Rows to CSV
    const csvContent = [
      headers.join(","), // Header Row
      ...data.map(row => headers.map(fieldName => {
        // Handle special characters and quotes
        const val = row[fieldName] === null || row[fieldName] === undefined ? "" : row[fieldName]
        return `"${String(val).replace(/"/g, '""')}"` 
      }).join(","))
    ].join("\n")

    // 3. Trigger Download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button variant="outline" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      {label}
    </Button>
  )
}