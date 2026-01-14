"use client"

import { useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { updateResiSchema } from "@/lib/order-schemas"
import { shipOrder, completeOrder, processOrder } from "./actions"
import { toast } from "sonner"
import { z } from "zod"
import { OrderDetail } from "./types"
import { useRouter } from "next/navigation" // Required for refreshing the page

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Truck, Package, User, Loader2, Receipt, Store, CheckCircle, Box } from "lucide-react"

export function OrderDetails({ order, isOpen, onClose }: { order: OrderDetail, isOpen: boolean, onClose: () => void }) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  
  const form = useForm<z.infer<typeof updateResiSchema>>({
    resolver: zodResolver(updateResiSchema),
    defaultValues: { tracking_number: order?.tracking_number || "" }
  })

  // --- ACTIONS ---

  // 1. Paid -> Packed
  function onProcess() {
    startTransition(async () => {
      const res = await processOrder(order.id)
      if (!res?.success) {
        toast.error(res?.message || "Terjadi kesalahan")
      } else {
        toast.success("Berhasil! Status diubah menjadi Dikemas.")
        onClose()
        router.refresh() // Force Table Refresh
      }
    })
  }

  // 2. Packed -> Shipped
  function onShip(values: z.infer<typeof updateResiSchema>) {
    startTransition(async () => {
      const res = await shipOrder(order.id, values)
      if (!res?.success) {
        toast.error(res?.message || "Terjadi kesalahan")
      } else {
        toast.success("Berhasil! Resi disimpan & Status Dikirim.")
        onClose()
        router.refresh() // Force Table Refresh
      }
    })
  }

  // 3. Shipped -> Completed
  function onComplete() {
    if(!confirm("Pastikan pesanan sudah diterima pembeli?")) return
    startTransition(async () => {
      const res = await completeOrder(order.id)
      if (!res?.success) {
        toast.error(res?.message || "Terjadi kesalahan")
      } else {
        toast.success("Pesanan Selesai!")
        onClose()
        router.refresh() // Force Table Refresh
      }
    })
  }

  if (!order) return null

  // Helper variables
  const isPaid = order.status === 'paid'
  const isPacked = order.status === 'packed'
  const isShipped = order.status === 'shipped'
  
  const subTotal = order.items.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0)
  const discount = order.coupon ? (subTotal * (order.coupon.discount_percent / 100)) : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full sm:max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
             <DialogTitle className="flex items-center gap-2 text-xl">
                Order #{order.id.slice(0, 8)}
                <Badge variant={
                        order.status === 'completed' ? 'default' :
                        order.status === 'cancelled' ? 'destructive' :
                        order.status === 'shipped' ? 'secondary' : 
                        'outline'
                      } className="capitalize ml-2">
                    {order.status === 'paid' ? 'Perlu Proses' : 
                     order.status === 'packed' ? 'Dikemas' : 
                     order.status}
                </Badge>
             </DialogTitle>
             <div className="text-sm text-muted-foreground">
                {new Date(order.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute:'2-digit' })} WIB
             </div>
          </div>
          <DialogDescription>Detail lengkap transaksi, pengiriman, dan produk.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 md:grid-cols-12">
          
          {/* LEFT: Products & Actions */}
          <div className="md:col-span-7 space-y-5">
             <div className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Package className="h-4 w-4 text-primary" /> Rincian Produk</h4>
                <Separator />
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-4 pr-3">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex gap-3 text-sm">
                         <div className="h-14 w-14 rounded bg-muted shrink-0 overflow-hidden border">
                            {item.variant?.product?.image_url ? (
                                <img src={item.variant.product.image_url} alt="product" className="h-full w-full object-cover" />
                            ) : (
                                <div className="h-full w-full flex items-center justify-center bg-gray-100 text-xs">IMG</div>
                            )}
                         </div>
                         <div className="flex-1">
                            <div className="font-medium line-clamp-1 text-base">{item.variant?.product?.name}</div>
                            <div className="text-muted-foreground text-xs mt-1">
                               Varian: <span className="text-foreground font-medium">{item.variant?.name}</span> • {item.quantity} barang
                            </div>
                         </div>
                         <div className="text-right font-medium">
                            Rp {(item.price_at_purchase * item.quantity).toLocaleString("id-ID")}
                         </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
             </div>

             <div className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><User className="h-4 w-4 text-primary" /> Informasi Pembeli</h4>
                <Separator />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                   <div>
                      <p className="text-muted-foreground text-xs mb-1">Nama</p>
                      <p className="font-medium">{order.buyer?.full_name || "Guest"}</p>
                   </div>
                   <div>
                      <p className="text-muted-foreground text-xs mb-1">Kontak</p>
                      <p className="font-medium">{order.buyer?.phone || "-"}</p>
                      <p className="text-xs text-muted-foreground">{order.buyer?.email}</p>
                   </div>
                </div>
             </div>
             
             {/* --- ACTIONS --- */}
             
             {isPaid && (
               <div className="border rounded-lg p-4 bg-orange-50/50 border-orange-100">
                  <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-orange-800">
                    <Box className="h-4 w-4" /> Proses Pesanan (Packing)
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    Pesanan sudah dibayar. Klik tombol di bawah jika Anda mulai mengemas pesanan ini.
                  </p>
                  <Button onClick={onProcess} disabled={isPending} className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700">
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Box className="h-4 w-4 mr-2" />}
                    Proses Pesanan
                  </Button>
               </div>
             )}

             {isPacked && order.delivery_method === 'shipping' && (
               <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-100">
                 <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-blue-800">
                    <Truck className="h-4 w-4" /> Input Resi Pengiriman
                 </h4>
                 <Form {...form}>
                   <form onSubmit={form.handleSubmit(onShip)} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                      <FormField control={form.control} name="tracking_number" render={({ field }) => (
                        <FormItem className="flex-1 w-full space-y-0">
                          <FormControl><Input placeholder="Masukan No. Resi" {...field} className="bg-white" /></FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )} />
                      <Button type="submit" disabled={isPending} size="default" className="w-full sm:w-auto">
                        {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Kirim"}
                      </Button>
                   </form>
                 </Form>
               </div>
             )}

             {isPacked && order.delivery_method === 'pickup' && (
                <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-100">
                   <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-blue-800">
                      <Store className="h-4 w-4" /> Pesanan Siap Diambil
                   </h4>
                   <Button onClick={onComplete} className="w-full" variant="outline" disabled={isPending}>
                     {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                     <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                     Tandai Sudah Diambil (Selesai)
                   </Button>
                </div>
             )}

             {isShipped && (
               <div className="border rounded-lg p-4 bg-green-50/50 border-green-100">
                 <h4 className="text-sm font-semibold flex items-center gap-2 mb-2 text-green-800">
                    <CheckCircle className="h-4 w-4" /> Konfirmasi Selesai
                 </h4>
                 <Button onClick={onComplete} className="w-full" variant="outline" disabled={isPending}>
                   {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                   Tandai Pesanan Selesai (Manual)
                 </Button>
               </div>
             )}
          </div>

          {/* RIGHT: Details */}
          <div className="md:col-span-5 space-y-5">
             <div className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /> Pembayaran</h4>
                <Separator />
                <div className="space-y-2 text-sm">
                   <div className="flex justify-between">
                      <span className="text-muted-foreground">Metode</span>
                      <span className="font-medium uppercase">{order.payment?.payment_type?.replace(/_/g, " ") || "-"}</span>
                   </div>
                   <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={order.payment?.transaction_status === 'settlement' || order.payment?.transaction_status === 'capture' ? 'default' : 'secondary'} className="h-5 px-1.5 text-[10px]">
                         {order.payment?.transaction_status || "Pending"}
                      </Badge>
                   </div>
                </div>
             </div>

             <div className="border rounded-lg p-4 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                    {order.delivery_method === 'pickup' ? <Store className="h-4 w-4 text-primary" /> : <Truck className="h-4 w-4 text-primary" />}
                    {order.delivery_method === 'pickup' ? "Ambil di Toko" : "Pengiriman"}
                </h4>
                <Separator />
                {order.delivery_method === 'pickup' ? (
                     <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                        Pembeli akan mengambil pesanan di lokasi toko Anda.
                     </div>
                ) : (
                    <div className="space-y-3 text-sm">
                        <div className="bg-muted p-3 rounded-md">
                            <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold">Alamat Tujuan</p>
                            <p className="font-medium">{order.shipping_address?.street_address}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                                {order.shipping_address?.city_name}, {order.shipping_address?.postal_code}
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="border rounded p-2">
                                <span className="text-muted-foreground block mb-0.5">Kurir</span>
                                <span className="font-bold uppercase text-sm">{order.courier_code || "-"}</span>
                            </div>
                            <div className="border rounded p-2">
                                <span className="text-muted-foreground block mb-0.5">Layanan</span>
                                <span className="font-medium text-sm">{order.courier_service || "-"}</span>
                            </div>
                            <div className="border rounded p-2 bg-blue-50 border-blue-100">
                                <span className="text-blue-600 block mb-0.5">No. Resi</span>
                                <span className="font-mono font-medium text-blue-700 text-sm truncate">{order.tracking_number || "-"}</span>
                            </div>
                        </div>
                    </div>
                )}
             </div>

             <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm border">
                <div className="flex justify-between">
                   <span className="text-muted-foreground">Subtotal Produk</span>
                   <span>Rp {subTotal.toLocaleString("id-ID")}</span>
                </div>
                {order.delivery_method === 'shipping' && (
                    <div className="flex justify-between">
                       <span className="text-muted-foreground">Ongkos Kirim</span>
                       <span>Rp {(order.shipping_cost || 0).toLocaleString("id-ID")}</span>
                    </div>
                )}
                {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                       <span>Diskon Coupon ({order.coupon?.code})</span>
                       <span>- Rp {discount.toLocaleString("id-ID")}</span>
                    </div>
                )}
                <Separator className="my-2 bg-slate-200" />
                <div className="flex justify-between font-bold text-lg">
                   <span>Total</span>
                   <span>Rp {order.total_amount.toLocaleString("id-ID")}</span>
                </div>
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}