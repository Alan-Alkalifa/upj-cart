// src/app/(shop)/orders/page.tsx
import { getUserOrders } from "@/app/actions/order";
import { OrderList } from "@/components/shop/ordet-list";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export const metadata = {
  title: "Riwayat Pesanan - Bemlanja",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orders = await getUserOrders();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col gap-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Riwayat Pesanan</h1>
        <p className="text-muted-foreground text-sm">
          Pantau status pembayaran dan pengiriman barang belanjaan Anda.
        </p>
      </div>
      <OrderList orders={orders} />
    </div>
  );
}