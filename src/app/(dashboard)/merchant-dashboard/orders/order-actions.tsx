"use client"

import { useState } from "react"
import { OrderDetails } from "./order-details"
import { Button } from "@/components/ui/button"
import { Eye, MoreHorizontal, Box, Truck } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { OrderDetail } from "./types"

export function OrderActions({ order }: { order: OrderDetail }) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Determine label for quick action if needed
  const showProcess = order.status === 'paid'
  const showShip = order.status === 'packed' && order.delivery_method === 'shipping'

  return (
    <>
      <div className="flex items-center justify-end gap-2">
         {/* Quick Actions for common tasks */}
         {showProcess && (
            <Button size="sm" variant="outline" className="h-8 border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800" onClick={() => setIsDetailsOpen(true)}>
               <Box className="h-3 w-3 mr-1" /> Proses
            </Button>
         )}
         {showShip && (
            <Button size="sm" variant="outline" className="h-8 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800" onClick={() => setIsDetailsOpen(true)}>
               <Truck className="h-3 w-3 mr-1" /> Kirim
            </Button>
         )}

         <DropdownMenu>
            <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
               <span className="sr-only">Open menu</span>
               <MoreHorizontal className="h-4 w-4" />
            </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuLabel>Aksi</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setIsDetailsOpen(true)}>
               <Eye className="mr-2 h-4 w-4" /> Lihat Detail
            </DropdownMenuItem>
            </DropdownMenuContent>
         </DropdownMenu>
      </div>

      <OrderDetails 
        order={order} 
        isOpen={isDetailsOpen} 
        onClose={() => setIsDetailsOpen(false)} 
      />
    </>
  )
}