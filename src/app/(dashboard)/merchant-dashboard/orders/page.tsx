// src/app/(dashboard)/merchant-dashboard/orders/page.tsx
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { OrderActions } from "./order-actions"
import { OrderSearch } from "./order-search"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Truck, CheckCircle, Clock, Search } from "lucide-react"
import Link from "next/link"

export default async function MerchantOrdersPage(props: { 
  searchParams: Promise<{ page?: string, status?: string, q?: string }> 
}) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  const statusFilter = searchParams.status || "all"
  const queryParam = searchParams.q || ""
  
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // 1. Get Merchant Org ID
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("profile_id", user.id)
    .single()
  
  if (!member) redirect("/")

  // 2. Build Query
  let query = supabase
    .from("orders")
    .select(`
      *,
      buyer:profiles(full_name, email, phone, avatar_url),
      shipping_address:user_addresses(*),
      items:order_items(
        id, quantity, price_at_purchase,
        variant:product_variants(
          name,
          product:products(name, image_url)
        )
      )
    `, { count: 'exact' })
    .eq("organization_id", member.org_id)
    .order("created_at", { ascending: false })

  // Filter by Status
  if (statusFilter !== 'all') {
    if (statusFilter === 'active') {
       // 'active' groups pending, paid, packed
       query = query.in('status', ['paid', 'packed'])
    } else {
       query = query.eq('status', statusFilter)
    }
  }

  // Filter by Search (Order ID or Tracking Number)
  if (queryParam) {
    query = query.or(`id.eq.${queryParam},tracking_number.eq.${queryParam}`)
  }

  // 3. Fetch Data (Parallel for List + Stats)
  const [ordersRes, allCount, activeCount, shippedCount, completedCount] = await Promise.all([
    query.range(start, end),
    // Stats Queries
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id),
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id).in('status', ['paid', 'packed']),
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id).eq('status', 'shipped'),
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id).eq('status', 'completed'),
  ])
  
  const orders = ordersRes.data || []
  const totalCount = ordersRes.count || 0

  // --- PAGINATION LOGIC ---
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

  const buildLink = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams()
    if (queryParam) params.set('q', queryParam)
    
    const finalPage = Number(newParams.page) || 1
    const finalStatus = newParams.status || statusFilter
    
    if (finalPage > 1) params.set('page', String(finalPage))
    if (finalStatus !== 'all') params.set('status', String(finalStatus))
    
    return `/merchant-dashboard/orders?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Daftar Pesanan</h2>
        <p className="text-muted-foreground">Pantau pesanan masuk, proses pengiriman, dan riwayat transaksi.</p>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pesanan</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Semua waktu</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perlu Proses</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{activeCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Sudah dibayar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dikirim</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{shippedCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Dalam perjalanan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Transaksi sukses</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Toolbar (Tabs + Search) */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        <Tabs defaultValue={statusFilter} className="w-full md:w-auto overflow-x-auto">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href={buildLink({ status: 'all', page: 1 })}>Semua</Link>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <Link href={buildLink({ status: 'active', page: 1 })}>
                 Perlu Proses
                 {(activeCount.count || 0) > 0 && <span className="ml-1.5 rounded-full bg-orange-100 text-orange-700 px-1.5 py-0.5 text-[10px]">{activeCount.count}</span>}
              </Link>
            </TabsTrigger>
            <TabsTrigger value="shipped" asChild>
              <Link href={buildLink({ status: 'shipped', page: 1 })}>Dikirim</Link>
            </TabsTrigger>
            <TabsTrigger value="completed" asChild>
              <Link href={buildLink({ status: 'completed', page: 1 })}>Selesai</Link>
            </TabsTrigger>
            <TabsTrigger value="cancelled" asChild>
              <Link href={buildLink({ status: 'cancelled', page: 1 })}>Batal</Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* Search Component */}
        <OrderSearch />
      </div>

      {/* 4. Table Section */}
      <div className="space-y-4">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Order ID</TableHead>
                <TableHead>Pembeli</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={6} className="h-64">
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        {queryParam ? (
                            <>
                                <Search className="h-10 w-10 opacity-20" />
                                <p className="text-center font-medium">Order "{queryParam}" tidak ditemukan.</p>
                            </>
                        ) : (
                            <>
                                <ShoppingBag className="h-10 w-10 opacity-20" />
                                <p className="text-center font-medium">Belum ada pesanan pada status ini.</p>
                            </>
                        )}
                      </div>
                   </TableCell>
                 </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      #{order.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{order.buyer?.full_name || "Guest"}</span>
                        <span className="text-xs text-muted-foreground">{order.buyer?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      Rp {order.total_amount.toLocaleString("id-ID")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        order.status === 'completed' ? 'default' :
                        order.status === 'cancelled' ? 'destructive' :
                        order.status === 'shipped' ? 'secondary' : 
                        order.status === 'paid' ? 'outline' : 'outline'
                      } className={
                        // Custom style for 'paid' and 'packed'
                        (order.status === 'paid' || order.status === 'packed') ? "border-orange-500 text-orange-600 bg-orange-50 hover:bg-orange-100" : "capitalize"
                      }>
                        {order.status === 'paid' ? 'Perlu Diproses' : order.status === 'packed' ? 'Siap Kirim' : order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(order.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
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

        {/* 5. Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
             Menampilkan <b>{orders.length > 0 ? start + 1 : 0}</b> - <b>{Math.min(end + 1, totalCount)}</b> dari <b>{totalCount}</b> pesanan
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
                        href={buildLink({ page: Number(page) })}
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