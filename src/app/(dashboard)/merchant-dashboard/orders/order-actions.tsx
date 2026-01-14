// src/app/(dashboard)/merchant-dashboard/orders/order-actions.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Eye, Truck, CheckCircle, AlertCircle, MapPin, Package } from "lucide-react"
import { updateOrderStatus } from "./actions"
import { toast } from "sonner"
import Image from "next/image"
import { formatRupiah } from "@/lib/utils"

interface OrderActionsProps {
  order: any
}

export function OrderActions({ order }: OrderActionsProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [trackingInput, setTrackingInput] = useState(order.tracking_number || "")

  // Helper: Handle Status Change
  const handleStatusChange = async (newStatus: string) => {
    setLoading(true)
    const result = await updateOrderStatus(order.id, newStatus, trackingInput)
    setLoading(false)

    if (result.success) {
      toast.success(result.message)
      setIsOpen(false)
    } else {
      toast.error(result.message)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="mr-2 h-4 w-4" /> Detail
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Detail Pesanan</DialogTitle>
            <Badge variant="outline" className="mr-6">{order.status.toUpperCase()}</Badge>
          </div>
          <DialogDescription>ID: {order.id}</DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          
          {/* --- LEFT: Shipping Info --- */}
          <div className="space-y-4">
            <h4 className="font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Informasi Pengiriman
            </h4>
            <div className="text-sm bg-muted/30 p-3 rounded-md space-y-1">
              <p className="font-medium">{order.shipping_address?.recipient_name}</p>
              <p className="text-muted-foreground">{order.shipping_address?.phone}</p>
              <Separator className="my-2" />
              <p>{order.shipping_address?.street_address}</p>
              <p>{order.shipping_address?.subdistrict_name}, {order.shipping_address?.city_name}</p>
              <p>{order.shipping_address?.province_name} {order.shipping_address?.postal_code}</p>
            </div>
            
            <div className="text-sm border p-3 rounded-md">
               <p className="text-muted-foreground mb-1">Kurir</p>
               <p className="font-medium uppercase">{order.courier_code || "-"} ({order.courier_service || "Reg"})</p>
               {order.tracking_number && (
                 <p className="mt-2 text-blue-600 font-mono text-xs">Resi: {order.tracking_number}</p>
               )}
            </div>
          </div>

          {/* --- RIGHT: Status Management --- */}
          <div className="space-y-4">
             <h4 className="font-semibold flex items-center gap-2">
               <AlertCircle className="h-4 w-4" /> Kelola Pesanan
             </h4>
             <div className="bg-muted/30 p-4 rounded-md flex flex-col gap-3 justify-center h-full">
                
                {/* STATE: PAID -> PROCESSED */}
                {order.status === 'paid' && (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Pesanan sudah dibayar. Segera proses pesanan ini.</p>
                    <Button 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
                      onClick={() => handleStatusChange('packed')}
                      disabled={loading}
                    >
                      {loading ? "Memproses..." : "Proses Pesanan (Kemas)"}
                    </Button>
                  </div>
                )}

                {/* STATE: PACKED -> SHIPPED */}
                {(order.status === 'packed' || order.status === 'processed') && (
                   <div className="space-y-3">
                     <div className="space-y-1">
                       <Label htmlFor="tracking">Masukkan Nomor Resi</Label>
                       <Input 
                         id="tracking" 
                         placeholder="Contoh: JP12345678" 
                         value={trackingInput}
                         onChange={(e) => setTrackingInput(e.target.value)}
                       />
                     </div>
                     <Button 
                       className="w-full" 
                       onClick={() => handleStatusChange('shipped')}
                       disabled={!trackingInput || loading}
                     >
                       <Truck className="mr-2 h-4 w-4" /> 
                       {loading ? "Mengirim..." : "Kirim Pesanan"}
                     </Button>
                   </div>
                )}

                {/* STATE: SHIPPED */}
                {order.status === 'shipped' && (
                  <div className="text-center text-green-600 flex flex-col items-center gap-2 py-4">
                     <CheckCircle className="h-8 w-8" />
                     <p className="font-medium">Pesanan Sedang Dikirim</p>
                     <p className="text-xs text-muted-foreground">Menunggu konfirmasi penerimaan dari pembeli.</p>
                  </div>
                )}

                 {/* STATE: COMPLETED */}
                 {order.status === 'completed' && (
                  <div className="text-center text-green-600 flex flex-col items-center gap-2 py-4">
                     <CheckCircle className="h-8 w-8" />
                     <p className="font-medium">Pesanan Selesai</p>
                  </div>
                )}
             </div>
          </div>
        </div>

        <Separator />

        {/* --- BOTTOM: Item List --- */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Package className="h-4 w-4" /> Daftar Produk
          </h4>
          <div className="border rounded-md divide-y">
            {order.items.map((item: any) => (
              <div key={item.id} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 bg-gray-100 rounded overflow-hidden">
                     <Image 
                        src={item.variant?.product?.image_url || "/placeholder.png"} 
                        alt="Product"
                        fill
                        className="object-cover"
                     />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.variant?.product?.name}</p>
                    <p className="text-xs text-muted-foreground">Varian: {item.variant?.name}</p>
                  </div>
                </div>
                <div className="text-right text-sm">
                   <p className="font-medium">{item.quantity} x {formatRupiah(item.price_at_purchase)}</p>
                   <p className="font-bold text-primary">{formatRupiah(item.quantity * item.price_at_purchase)}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <div className="text-right">
               <p className="text-sm text-muted-foreground">Total Pesanan</p>
               <p className="text-xl font-bold text-primary">{formatRupiah(order.total_amount)}</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}