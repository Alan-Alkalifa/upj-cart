import { createClient } from "@/utils/supabase/server"
import { DateRangeFilter } from "@/components/dashboard/date-range-filter"
import { ExportButton } from "@/components/dashboard/export-button"
import { OrderActions } from "./order-actions"
import { OrderSearch } from "./order-search" 
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Search } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination"

export default async function OrdersPage(props: { searchParams: Promise<{ page?: string, status?: string, from?: string, to?: string, q?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  const statusFilter = searchParams.status || "new"
  const searchQuery = searchParams.q || "" 
  
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("profile_id", user.id).single()
  if (!member) redirect("/")

  // --- 1. BASE QUERY ---
  let baseQuery = supabase
    .from("order_items")
    .select(`
      order_id,
      orders!inner (
        id, status, total_amount, created_at,
        profiles (full_name, email, phone),
        user_addresses (street_address, city, postal_code)
      ),
      product_variants!inner ( products!inner ( org_id ) )
    `)
    .eq("product_variants.products.org_id", member.org_id)
    .order("created_at", { ascending: false, referencedTable: "orders" })

  if (searchParams.from) baseQuery = baseQuery.gte("orders.created_at", searchParams.from)
  if (searchParams.to) {
    const toDate = new Date(searchParams.to)
    toDate.setHours(23, 59, 59)
    baseQuery = baseQuery.lte("orders.created_at", toDate.toISOString())
  }

  const { data: rawItems } = await baseQuery

  // --- 2. DEDUPLICATE ---
  const uniqueOrdersMap = new Map()
  rawItems?.forEach((item: any) => {
    if (item.orders) {
      uniqueOrdersMap.set(item.orders.id, item.orders)
    }
  })
  
  let allOrders = Array.from(uniqueOrdersMap.values())

  // --- 3. APPLY SEARCH FILTER (In-Memory) ---
  if (searchQuery) {
    const lowerQ = searchQuery.toLowerCase()
    allOrders = allOrders.filter((o: any) => {
      const matchId = o.id.toLowerCase().includes(lowerQ)
      const matchName = o.profiles?.full_name?.toLowerCase().includes(lowerQ)
      return matchId || matchName
    })
  }

  // --- 4. CALCULATE STATS & TABS COUNTS (Based on Filtered Data) ---
  const countByStatus = {
    new: allOrders.filter((o: any) => ['paid', 'packed'].includes(o.status)).length,
    shipped: allOrders.filter((o: any) => o.status === 'shipped').length,
    completed: allOrders.filter((o: any) => o.status === 'completed').length,
    cancelled: allOrders.filter((o: any) => o.status === 'cancelled').length,
  }

  const stats = {
    pending: countByStatus.new,
    total: allOrders.length,
    completed: countByStatus.completed,
    volume: allOrders.filter((o: any) => o.status !== 'cancelled').reduce((acc: number, o: any) => acc + o.total_amount, 0)
  }

  // --- 5. FILTER FOR CURRENT TAB ---
  let filteredOrders = []
  if (statusFilter === 'shipped') {
    filteredOrders = allOrders.filter((o: any) => o.status === 'shipped')
  } else if (statusFilter === 'completed') {
    filteredOrders = allOrders.filter((o: any) => o.status === 'completed')
  } else if (statusFilter === 'cancelled') {
    filteredOrders = allOrders.filter((o: any) => o.status === 'cancelled')
  } else {
    filteredOrders = allOrders.filter((o: any) => ['paid', 'packed'].includes(o.status))
  }

  // --- 6. PAGINATION ---
  const totalCount = filteredOrders.length
  const paginatedOrders = filteredOrders.slice(start, end)
  const totalPages = Math.ceil(totalCount / perPage)
  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push("ellipsis")
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push("ellipsis")
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push("ellipsis")
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push("ellipsis")
        pages.push(totalPages)
      }
    }
    return pages
  }

  // Updated Build Link to include 'q'
  const buildLink = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams()
    if (searchParams.from) params.set('from', searchParams.from)
    if (searchParams.to) params.set('to', searchParams.to)
    if (searchQuery) params.set('q', searchQuery)
    
    const finalPage = newParams.page || 1
    const finalStatus = newParams.status || statusFilter

    params.set('page', String(finalPage))
    params.set('status', String(finalStatus))
    
    return `/merchant/orders?${params.toString()}`
  }

  // Export data uses allOrders (matching search result)
  const exportData = allOrders.map((o: any) => ({
    Order_ID: o.id,
    Date: new Date(o.created_at).toLocaleDateString("id-ID"),
    Customer: o.profiles?.full_name,
    Email: o.profiles?.email,
    Total: o.total_amount,
    Status: o.status
  }))

  const getEmptyMessage = () => {
    if (searchQuery) return `Tidak ditemukan pesanan dengan kata kunci "${searchQuery}".`
    if (statusFilter === 'new') return "Tidak ada pesanan perlu dikirim."
    return "Tidak ada data."
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pesanan</h2>
          <p className="text-muted-foreground">Kelola pesanan masuk dan status pengiriman.</p>
        </div>
        <div className="flex items-center gap-2">
           <DateRangeFilter />
           <ExportButton data={exportData} filename="laporan_pesanan" />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Perlu Dikirim</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-orange-600">{stats.pending}</div></CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total (Filter)</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold">{stats.total}</div></CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Selesai</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-green-600">{stats.completed}</div></CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Volume (Filter)</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold">Rp {(stats.volume / 1000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb</div></CardContent>
        </Card>
      </div>

      {/* TOOLBAR: TABS + SEARCH */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        <Tabs defaultValue={statusFilter} className="w-full md:w-auto">
          <TabsList className="w-full h-full justify-start overflow-hidden overflow-x-auto">
            <TabsTrigger value="new" asChild>
              <Link href={buildLink({ status: 'new', page: 1 })}>Perlu Dikirim ({countByStatus.new})</Link>
            </TabsTrigger>
            <TabsTrigger value="shipped" asChild>
              <Link href={buildLink({ status: 'shipped', page: 1 })}>Sedang Dikirim ({countByStatus.shipped})</Link>
            </TabsTrigger>
            <TabsTrigger value="completed" asChild>
              <Link href={buildLink({ status: 'completed', page: 1 })}>Selesai ({countByStatus.completed})</Link>
            </TabsTrigger>
            <TabsTrigger value="cancelled" asChild>
              <Link href={buildLink({ status: 'cancelled', page: 1 })}>Dibatalkan ({countByStatus.cancelled})</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* COMPONENT SEARCH */}
        <OrderSearch />
      </div>

      {/* TABLE */}
      <div className="space-y-4">
        <div className="rounded-md border bg-card">
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
              {paginatedOrders.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={6} className="h-64">
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        {searchQuery ? <Search className="h-10 w-10 opacity-20" /> : <ShoppingBag className="h-10 w-10 opacity-20" />}
                        <p className="text-center font-medium">{getEmptyMessage()}</p>
                      </div>
                   </TableCell>
                </TableRow>
              ) : (
                paginatedOrders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">
                        {order.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{order.profiles?.full_name}</div>
                      <div className="text-[10px] text-muted-foreground">{order.user_addresses?.city || "-"}</div>
                    </TableCell>
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
                      <OrderActions order={order} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
             Menampilkan <b>{paginatedOrders.length > 0 ? start + 1 : 0}</b> - <b>{Math.min(start + paginatedOrders.length, totalCount)}</b> dari <b>{totalCount}</b> pesanan
          </div>

          {totalPages > 1 && (
            <Pagination className="justify-center md:justify-end w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href={hasPrev ? buildLink({ page: currentPage - 1 }) : "#"} 
                    className={!hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={!hasPrev}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, i) => (
                  <PaginationItem key={i}>
                    {page === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink 
                        href={buildLink({ page })}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    href={hasNext ? buildLink({ page: currentPage + 1 }) : "#"}
                    className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={!hasNext}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  )
}