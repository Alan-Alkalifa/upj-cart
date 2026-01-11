// src/components/shop/order-list.tsx
"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { OrderCard } from "./order-card";
import { PackageX } from "lucide-react";

interface OrderListProps {
  orders: any[];
}

export function OrderList({ orders }: OrderListProps) {
  const [activeTab, setActiveTab] = useState("all");

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    // Group active statuses
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
      <div className="overflow-x-auto pb-2">
        <TabsList className="w-full justify-start h-auto p-1 bg-transparent gap-2">
          {tabItems.map((tab) => (
            <TabsTrigger 
                key={tab.value} 
                value={tab.value} 
                className="min-w-[100px] border border-muted data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value={activeTab} className="space-y-4">
        {filteredOrders.length > 0 ? (
          filteredOrders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground border rounded-lg border-dashed">
            <PackageX className="h-12 w-12 mb-4 opacity-50" />
            <p className="font-medium">Tidak ada pesanan di tab ini.</p>
            <p className="text-sm">Silakan cek status lainnya atau mulai belanja.</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}