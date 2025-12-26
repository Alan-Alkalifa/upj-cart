"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateResiSchema } from "@/lib/order-schemas"
import { shipOrder, completeOrder } from "./actions"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Truck, Package, MapPin, User, Loader2 } from "lucide-react"

export function OrderDetails({ order, isOpen, onClose }: { order: any, isOpen: boolean, onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  
  const form = useForm<z.infer<typeof updateResiSchema>>({
    resolver: zodResolver(updateResiSchema),
    defaultValues: { tracking_number: "" }
  })

  // --- ACTIONS ---
  function onShip(values: z.infer<typeof updateResiSchema>) {
    startTransition(async () => {
      const res = await shipOrder(order.id, values)
      if (res?.error) toast.error(res.error)
      else {
        toast.success("Pesanan dikirim!")
        onClose()
      }
    })
  }

  function onComplete() {
    if(!confirm("Pastikan pesanan sudah diterima pembeli?")) return
    startTransition(async () => {
      const res = await completeOrder(order.id)
      if (res?.error) toast.error(res.error)
      else {
        toast.success("Pesanan selesai!")
        onClose()
      }
    })
  }

  if (!order) return null

  // Calculate Total Items
  const totalItems = order.order_items.reduce((acc: number, item: any) => acc + item.quantity, 0)
  const isPaid = order.status === 'paid'
  const isShipped = order.status === 'shipped'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
             <DialogTitle className="flex items-center gap-2">
                Order #{order.id.slice(0, 8)}
                <Badge variant="outline" className="capitalize">{order.status}</Badge>
             </DialogTitle>
          </div>
          <DialogDescription>
            Dipesan pada {new Date(order.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT: Items List */}
          <div className="space-y-4">
             <h4 className="text-sm font-medium flex items-center gap-2"><Package className="h-4 w-4" /> Rincian Produk</h4>
             <ScrollArea className="h-[200px] rounded-md border p-3">
                <div className="space-y-4">
                  {order.order_items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                       <div>
                          <div className="font-medium">{item.product_variants?.products?.name}</div>
                          <div className="text-muted-foreground text-xs">
                             {item.product_variants?.name} x {item.quantity}
                          </div>
                       </div>
                       <div>Rp {(item.price_at_purchase * item.quantity).toLocaleString("id-ID")}</div>
                    </div>
                  ))}
                </div>
             </ScrollArea>
             <div className="flex justify-between font-medium text-sm pt-2 border-t">
                <span>Total ({totalItems} barang)</span>
                <span>Rp {order.total_amount.toLocaleString("id-ID")}</span>
             </div>
          </div>

          {/* RIGHT: Customer & Action */}
          <div className="space-y-6">
             {/* Customer Info */}
             <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2"><User className="h-4 w-4" /> Pembeli</h4>
                <div className="text-sm rounded-md bg-muted p-3">
                   <div className="font-medium">{order.profiles?.full_name}</div>
                   <div className="text-muted-foreground text-xs">{order.profiles?.email}</div>
                   <div className="text-muted-foreground text-xs">{order.profiles?.phone}</div>
                </div>
             </div>

             {/* Shipping Info */}
             <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2"><MapPin className="h-4 w-4" /> Alamat Pengiriman</h4>
                <div className="text-sm rounded-md bg-muted p-3 text-muted-foreground">
                   {order.user_addresses ? (
                     <>
                       <p>{order.user_addresses.street_address}</p>
                       <p>{order.user_addresses.city}, {order.user_addresses.postal_code}</p>
                     </>
                   ) : "Ambil di Toko (Pickup)"}
                </div>
             </div>
             
             {/* Action Form: Input Resi */}
             {isPaid && (
               <div className="space-y-3 pt-2">
                 <Separator />
                 <h4 className="text-sm font-medium flex items-center gap-2"><Truck className="h-4 w-4" /> Proses Pengiriman</h4>
                 <Form {...form}>
                   <form onSubmit={form.handleSubmit(onShip)} className="flex gap-2">
                      <FormField control={form.control} name="tracking_number" render={({ field }) => (
                        <FormItem className="flex-1 space-y-0">
                          <FormControl><Input placeholder="Masukan No. Resi" {...field} /></FormControl>
                        </FormItem>
                      )} />
                      <Button type="submit" disabled={isPending}>
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim"}
                      </Button>
                   </form>
                 </Form>
               </div>
             )}

             {isShipped && (
               <Button onClick={onComplete} className="w-full" disabled={isPending}>
                 {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 Tandai Selesai (Manual)
               </Button>
             )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}