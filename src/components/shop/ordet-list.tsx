// src/components/shop/ordet-list.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderCard } from "./order-card";
import { PackageX, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface OrderListProps {
  orders: any[];
}

export function OrderList({ orders }: OrderListProps) {
  const [activeTab, setActiveTab] = useState("all");

  // Filter logic based on the selected tab
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    // Special grouping for "active" orders
    if (activeTab === "active") return ["pending", "paid", "packed", "shipped"].includes(order.status);
    return order.status === activeTab;
  });

  const tabItems = [
    { value: "all", label: "Semua" },
    { value: "pending", label: "Belum Bayar" },
    { value: "packed", label: "Dikemas" },
    { value: "shipped", label: "Dikirim" },
    { value: "completed", label: "Selesai" },
    { value: "cancelled", label: "Dibatalkan" },
  ];

  return (
    <Tabs defaultValue="all" className="w-full space-y-6" onValueChange={setActiveTab}>
      <div className="overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <TabsList className="h-auto p-1 bg-transparent gap-2 w-max sm:w-full sm:justify-start">
          {tabItems.map((tab) => (
            <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                className="rounded-full px-4 py-2 border border-muted bg-background hover:bg-muted/50 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value={activeTab} className="space-y-4 animate-in fade-in-50 duration-300">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-xl bg-muted/20">
            <div className="bg-background p-4 rounded-full mb-4 shadow-sm">
              <PackageX className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Tidak ada pesanan</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
              Belum ada pesanan yang ditemukan pada kategori ini.
            </p>
            <Button asChild variant="default">
              <Link href="/">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Mulai Belanja
              </Link>
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}