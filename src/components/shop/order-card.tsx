// src/components/shop/order-card.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, formatDate } from "@/lib/utils";
import { PayButton } from "./pay-button";
import { Truck, Calendar, Store, ChevronRight } from "lucide-react";

interface OrderCardProps {
  order: any;
}

export function OrderCard({ order }: OrderCardProps) {
  // Mapping status to Badge variants
  const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",
    paid: "default",
    packed: "default",
    shipped: "outline",
    completed: "default",
    cancelled: "destructive",
  };

  const isPending = order.status === "pending" && order.snap_token;
  const isShipped = order.status === "shipped";
  const orgName = order.organization?.name || "Toko";

  return (
    <Card className="overflow-hidden border-muted transition-all hover:border-primary/50 group shadow-sm hover:shadow-md">
      {/* --- HEADER --- */}
      <CardHeader className="flex flex-row items-start justify-between bg-muted/20 p-4 sm:p-5">
        <div className="space-y-1">
          {/* Store Name Link */}
          <Link 
            href={order.organization?.slug ? `/merchant/${order.organization.slug}` : "#"} 
            className="flex items-center gap-2 hover:underline"
          >
            <Store className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">{orgName}</span>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          </Link>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(order.created_at)}
            <span>•</span>
            <span className="font-mono">#{order.id.slice(0, 8)}</span>
          </div>
        </div>
        
        <Badge 
          variant={statusColor[order.status] || "default"}
          className="capitalize shadow-none"
        >
          {order.status === "pending" ? "Menunggu Pembayaran" : order.status}
        </Badge>
      </CardHeader>

      <Separator />

      {/* --- CONTENT --- */}
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col gap-4">
          {order.items.map((item: any) => {
             // Safe fallback if product data is missing or deleted
             const product = item.variant?.product;
             const productName = product?.name || "Produk tidak tersedia";
             const productImage = product?.image_url || "/placeholder.png";
             const variantName = item.variant?.name || "-";
             const productId = product?.id;
             
             return (
              <div key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-start">
                {/* Product Image Link */}
                <Link href={productId ? `/products/${productId}` : "#"} className={`shrink-0 ${!productId && "pointer-events-none"}`}>
                  <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-gray-50 hover:opacity-90 transition-opacity">
                    <Image
                      src={productImage}
                      alt={productName}
                      fill
                      className="object-cover"
                    />
                  </div>
                </Link>

                {/* Product Details */}
                <div className="flex-1 space-y-1">
                  <Link href={productId ? `/products/${productId}` : "#"} className={`hover:underline ${!productId && "pointer-events-none"}`}>
                    <h4 className="text-sm font-medium leading-tight line-clamp-2">
                      {productName}
                    </h4>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    Varian: <span className="text-foreground">{variantName}</span>
                  </p>
                  <div className="flex items-center justify-between sm:hidden mt-2">
                    <span className="text-xs text-muted-foreground">{item.quantity} barang</span>
                    <span className="text-sm font-medium">{formatRupiah(item.price_at_purchase)}</span>
                  </div>
                </div>

                {/* Price (Desktop) */}
                <div className="hidden sm:block text-right">
                  <p className="font-medium text-sm">
                    {formatRupiah(item.price_at_purchase * item.quantity)}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.quantity} x {formatRupiah(item.price_at_purchase)}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      <Separator />

      {/* --- FOOTER --- */}
      <CardFooter className="flex flex-col gap-4 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-col gap-1 w-full sm:w-auto">
          <span className="text-xs text-muted-foreground font-medium">Total Belanja</span>
          <span className="text-lg font-bold text-primary">
            {formatRupiah(order.total_amount)}
          </span>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {/* Payment Action */}
          {isPending && (
            <div className="w-full sm:w-auto">
              <PayButton snapToken={order.snap_token} orderId={order.id} />
            </div>
          )}
          
          {/* Tracking Info */}
          {isShipped && order.tracking_number && (
            <div className="flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300">
              <Truck className="h-4 w-4" />
              <span className="font-medium">Resi: {order.tracking_number}</span>
            </div>
          )}

          {/* Detail Link */}
           <Button variant="outline" size="sm" className="w-full sm:w-auto border-dashed hover:border-solid" asChild>
            <Link href={`/orders/${order.id}`}>Detail Transaksi</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}