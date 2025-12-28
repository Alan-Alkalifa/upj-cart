"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { OrderDetails } from "./order-details"

export function OrderActions({ order }: { order: any }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Eye className="mr-2 h-4 w-4" /> Detail
      </Button>
      {/* Modal Detail Order */}
      <OrderDetails order={order} isOpen={open} onClose={() => setOpen(false)} />
    </>
  )
}