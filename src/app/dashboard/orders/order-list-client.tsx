"use client"

import { useState } from "react"
import { OrderDetails } from "./order-details"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"

export function OrderListClient({ orders }: { orders: any[] }) {
  const [selectedOrder, setSelectedOrder] = useState<any>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const openDetails = (order: any) => {
    setSelectedOrder(order)
    setIsDialogOpen(true)
  }

  // Filter Helper
  const getOrdersByStatus = (statusGroup: string[]) => {
    return orders.filter(o => statusGroup.includes(o.status))
  }

  const renderTable = (data: any[]) => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order ID</TableHead>
            <TableHead>Pembeli</TableHead>
            <TableHead>Tanggal</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="h-24 text-center">Tidak ada pesanan.</TableCell></TableRow>
          ) : (
            data.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-mono text-xs">{order.id.slice(0, 8)}...</TableCell>
                <TableCell>{order.profiles?.full_name}</TableCell>
                <TableCell>{new Date(order.created_at).toLocaleDateString("id-ID")}</TableCell>
                <TableCell>Rp {order.total_amount.toLocaleString("id-ID")}</TableCell>
                <TableCell>
                  <Badge variant={
                    order.status === 'paid' ? 'default' : 
                    order.status === 'shipped' ? 'secondary' : 
                    order.status === 'completed' ? 'outline' : 'destructive'
                  } className="capitalize">
                    {order.status === 'paid' ? 'Perlu Dikirim' : order.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => openDetails(order)}>
                    <Eye className="mr-2 h-4 w-4" /> Detail
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <>
      <Tabs defaultValue="new" className="w-full">
        <TabsList>
          <TabsTrigger value="new">Perlu Dikirim ({getOrdersByStatus(['paid', 'packed']).length})</TabsTrigger>
          <TabsTrigger value="shipped">Sedang Dikirim ({getOrdersByStatus(['shipped']).length})</TabsTrigger>
          <TabsTrigger value="completed">Selesai ({getOrdersByStatus(['completed']).length})</TabsTrigger>
          <TabsTrigger value="cancelled">Dibatalkan ({getOrdersByStatus(['cancelled']).length})</TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="new">{renderTable(getOrdersByStatus(['paid', 'packed']))}</TabsContent>
          <TabsContent value="shipped">{renderTable(getOrdersByStatus(['shipped']))}</TabsContent>
          <TabsContent value="completed">{renderTable(getOrdersByStatus(['completed']))}</TabsContent>
          <TabsContent value="cancelled">{renderTable(getOrdersByStatus(['cancelled']))}</TabsContent>
        </div>
      </Tabs>

      {/* Ensure OrderDetails component exists in the same folder */}
      <OrderDetails 
        order={selectedOrder} 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
      />
    </>
  )
}