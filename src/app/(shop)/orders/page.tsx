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
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Riwayat Pesanan</h1>
      <OrderList orders={orders} />
    </div>
  );
}