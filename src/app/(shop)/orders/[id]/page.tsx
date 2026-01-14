// src/app/(shop)/orders/[id]/page.tsx
import { getOrderDetails } from "@/app/actions/order";
import { formatRupiah, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Truck,
  Store,
  ArrowLeft,
  CreditCard,
  Calendar,
  Copy,
  Star,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { PayButton } from "@/components/shop/pay-button";
import { OrderActionButtons } from "@/components/shop/order-actions-button";

export const metadata = {
  title: "Detail Transaksi - Bemlanja",
};

export default async function OrderDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  const order = await getOrderDetails(params.id);

  if (!order) {
    notFound();
  }

  // Consistent Status Colors
  const statusColor: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    pending: "secondary",
    paid: "default",
    packed: "default",
    shipped: "outline",
    completed: "default",
    cancelled: "destructive",
  };

  const isPending = order.status === "pending" && order.snap_token;
  // Check if any reviews exist for this order
  const hasReviewed = order.reviews && order.reviews.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in duration-500">
      {/* --- PAGE HEADER --- */}
      <div className="flex flex-col gap-2 mb-8">
        <Button
          variant="ghost"
          asChild
          className="w-fit pl-0 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <Link href="/orders">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Riwayat
          </Link>
        </Button>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Detail Transaksi
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Lihat detail lengkap status, pengiriman, dan produk yang dibeli.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={statusColor[order.status || "pending"]}
              className="text-sm px-3 py-1 capitalize"
            >
              {order.status === "pending"
                ? "Menunggu Pembayaran"
                : order.status}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* --- LEFT COLUMN (2/3) --- */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. PRODUCT LIST CARD */}
          <Card className="overflow-hidden border-muted shadow-sm">
            <CardHeader className="bg-muted/20 pb-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    {order.organization?.name || "Toko"}
                  </CardTitle>
                  <CardDescription>
                    No. Order:{" "}
                    <span className="font-mono text-foreground font-medium">
                      {order.id}
                    </span>
                  </CardDescription>
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(order.created_at)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[80px] pl-6">Produk</TableHead>
                    <TableHead>Detail</TableHead>
                    <TableHead className="text-right pr-6">Harga</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.items.map((item: any) => (
                    <TableRow key={item.id} className="hover:bg-muted/5">
                      <TableCell className="pl-6 align-top py-4">
                        <Link
                          href={
                            item.variant?.product?.id
                              ? `/products/${item.variant.product.id}`
                              : "#"
                          }
                        >
                          <div className="relative h-16 w-16 rounded-md overflow-hidden border bg-gray-50">
                            <Image
                              src={
                                item.variant?.product?.image_url ||
                                "/placeholder.png"
                              }
                              alt={item.variant?.product?.name || "Produk"}
                              fill
                              className="object-cover"
                            />
                          </div>
                        </Link>
                      </TableCell>
                      <TableCell className="align-top py-4">
                        <Link
                          href={
                            item.variant?.product?.id
                              ? `/products/${item.variant.product.id}`
                              : "#"
                          }
                          className="hover:underline"
                        >
                          <p className="font-medium text-sm line-clamp-2">
                            {item.variant?.product?.name || "Produk dihapus"}
                          </p>
                        </Link>
                        <p className="text-xs text-muted-foreground mt-1">
                          Varian: {item.variant?.name || "-"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Qty: {item.quantity} x{" "}
                          {formatRupiah(item.price_at_purchase)}
                        </p>
                      </TableCell>
                      <TableCell className="text-right pr-6 align-top py-4 font-medium">
                        {formatRupiah(item.quantity * item.price_at_purchase)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 2. SHIPPING INFO CARD */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Truck className="h-5 w-5 text-muted-foreground" />
                Informasi Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Kurir & Layanan
                </p>
                <p className="font-medium uppercase">
                  {order.courier_code || "-"} -{" "}
                  {order.courier_service || "Regular"}
                </p>

                {order.tracking_number && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-md text-blue-700 text-sm">
                    <p className="text-xs text-blue-500 mb-1 font-medium">
                      NOMOR RESI
                    </p>
                    <div className="flex items-center gap-2 font-mono font-bold">
                      {order.tracking_number}
                      <Copy className="h-3 w-3 cursor-pointer opacity-50 hover:opacity-100" />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Alamat Penerima
                </p>
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {order.shipping_address?.recipient_name}
                    </p>
                    <p className="text-muted-foreground">
                      {order.shipping_address?.phone}
                    </p>
                    <p className="text-muted-foreground mt-1 leading-relaxed">
                      {order.shipping_address?.street_address},{" "}
                      {order.shipping_address?.subdistrict_name},
                      <br />
                      {order.shipping_address?.city_name},{" "}
                      {order.shipping_address?.province_name}{" "}
                      {order.shipping_address?.postal_code}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* --- RIGHT COLUMN (1/3) --- */}
        <div className="space-y-6">
          {/* 3. PAYMENT SUMMARY CARD */}
          <Card className="shadow-sm sticky top-8">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                Rincian Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total Harga ({order.items.length} Barang)
                  </span>
                  <span>
                    {formatRupiah(
                      order.total_amount -
                        (order.shipping_cost || 0) -
                        (order.insurance_cost || 0)
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total Ongkos Kirim
                  </span>
                  <span>{formatRupiah(order.shipping_cost || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Biaya Layanan/Asuransi
                  </span>
                  <span>{formatRupiah(order.insurance_cost || 0)}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">Total Belanja</span>
                <span className="font-bold text-lg text-primary">
                  {formatRupiah(order.total_amount)}
                </span>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 bg-muted/5 pt-6">
              {/* Payment Button if Pending */}
              {isPending && (
                <PayButton snapToken={order.snap_token} orderId={order.id} />
              )}

              {/* Actions for Shipped/Completed Orders */}
              <OrderActionButtons
                orderId={order.id}
                orderStatus={order.status || ""}
                items={order.items}
                hasReviewed={hasReviewed}
              />

              {/* Merchant Link */}
              {!isPending && (
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/merchant/${order.organization?.slug}`}>
                    Kunjungi Toko
                  </Link>
                </Button>
              )}

              <p className="text-xs text-center text-muted-foreground px-4">
                Butuh bantuan?{" "}
                <a
                  href="mailto:support@bemlanja.com"
                  className="underline hover:text-primary"
                >
                  Hubungi CS Bemlanja
                </a>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
