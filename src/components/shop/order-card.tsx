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
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatRupiah, formatDate } from "@/lib/utils";
import { PayButton } from "./pay-button";
import { ShoppingBag, Truck, Calendar, Store } from "lucide-react";

interface OrderCardProps {
  order: any;
}

export function OrderCard({ order }: OrderCardProps) {
  // 1. Consistent Status Colors (matching Dashboard standards)
  const statusColor: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    pending: "secondary",    // Yellow/Orange-ish feel usually
    paid: "default",         // Solid primary color
    packed: "default",
    shipped: "outline",      // Border only
    completed: "default",    // Green-ish usually handled by class overrides if needed
    cancelled: "destructive", // Red
  };

  const isPending = order.status === "pending" && order.snap_token;
  const isShipped = order.status === "shipped";

  return (
    <Card className="overflow-hidden border-muted transition-all hover:shadow-md">
      {/* --- HEADER: Order Info & Status --- */}
      <CardHeader className="flex flex-row items-start justify-between bg-muted/30 p-4 sm:p-6">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Store className="h-4 w-4 text-primary" />
            <span>{order.organization?.name || "Toko UPJ"}</span>
          </CardTitle>
          <CardDescription className="flex items-center gap-2 text-xs">
            <Calendar className="h-3 w-3" />
            {formatDate(order.created_at)}
            <span className="hidden sm:inline">•</span>
            <span className="font-mono text-xs">#{order.id.slice(0, 8)}</span>
          </CardDescription>
        </div>
        
        <Badge 
          variant={statusColor[order.status] || "default"}
          className="capitalize shadow-sm"
        >
          {order.status === "pending" ? "Menunggu Pembayaran" : order.status}
        </Badge>
      </CardHeader>

      <Separator />

      {/* --- CONTENT: Items --- */}
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          {order.items.map((item: any) => (
            <div key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {/* Product Image */}
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-background">
                <Image
                  src={item.variant?.product?.image_url || "/placeholder.png"}
                  alt={item.variant?.product?.name || "Product"}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Product Details */}
              <div className="flex-1 space-y-1">
                <h4 className="text-sm font-medium leading-none">
                  {item.variant?.product?.name}
                </h4>
                <p className="text-xs text-muted-foreground">
                  Varian: <span className="font-medium text-foreground">{item.variant?.name}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Qty: {item.quantity} x {formatRupiah(item.price_at_purchase)}
                </p>
              </div>

              {/* Price (Right Aligned on Desktop) */}
              <div className="text-left sm:text-right">
                <p className="font-semibold text-sm">
                  {formatRupiah(item.price_at_purchase * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Separator />

      {/* --- FOOTER: Totals & Actions --- */}
      <CardFooter className="flex flex-col gap-4 bg-muted/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Pesanan</span>
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
          
          {/* Shipping Info */}
          {isShipped && order.tracking_number && (
            <div className="flex items-center justify-center gap-2 rounded-md bg-blue-50 px-4 py-2 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
              <Truck className="h-4 w-4" />
              <span className="font-medium">Resi: {order.tracking_number}</span>
            </div>
          )}

          {/* Detail Link (Standard action button) */}
           <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link href={`/orders/${order.id}`}>Lihat Detail</Link>
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}