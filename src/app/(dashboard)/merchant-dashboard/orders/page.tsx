import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { OrderActions } from "./order-actions"
import { OrderSearch } from "./order-search"
import { ExportButton } from "@/components/dashboard/export-button"
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
} from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ShoppingBag, Truck, CheckCircle, Clock, Search, Banknote, Package, XCircle } from "lucide-react"
import Link from "next/link"
import { OrderDetail } from "./types"

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

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("profile_id", user.id)
    .single()
  
  if (!member) redirect("/")

  // 1. QUERY BUILDER
  let query = supabase
    .from("orders")
    .select(`
      *,
      buyer:profiles(full_name, email, phone, avatar_url),
      shipping_address:user_addresses(*),
      payment:payments(payment_type, transaction_status),
      coupon:coupons(code, discount_percent),
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

  // 2. STRICT STATUS FILTERING
  // We removed the 'active' group. Now we filter strictly by the specific status.
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter)
  }

  // Search Filter
  if (queryParam) {
    query = query.or(`id.eq.${queryParam},tracking_number.eq.${queryParam}`)
  }

  // 3. DATA FETCHING (Parallel)
  // We fetch counts for 'paid' and 'packed' separately now
  const [ordersRes, allCount, paidCount, packedCount, shippedCount, completedCount, cancelledCount] = await Promise.all([
    query.range(start, end),
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id),
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id).eq('status', 'paid'), // Perlu Proses
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id).eq('status', 'packed'), // Dikemas
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id).eq('status', 'shipped'), // Dikirim
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id).eq('status', 'completed'), // Selesai
    supabase.from("orders").select("*", { count: 'exact', head: true }).eq("organization_id", member.org_id).eq('status', 'cancelled'), // Batal
  ])
  
  const orders = (ordersRes.data || []) as unknown as OrderDetail[]
  const totalCount = ordersRes.count || 0

  // 4. PREPARE EXPORT DATA
  const exportData = orders.map(o => ({
    "Order ID": o.id,
    "Date": new Date(o.created_at).toISOString().split('T')[0],
    "Status": o.status,
    "Buyer Name": o.buyer?.full_name || "Guest",
    "Items Count": o.items.length,
    "Total Amount": o.total_amount,
    "Tracking Number": o.tracking_number || ""
  }))

  // 5. PAGINATION HELPERS
  const totalPages = Math.ceil(totalCount / perPage)
  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1

  const buildLink = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams()
    if (queryParam) params.set('q', queryParam)
    const finalPage = newParams.page || 1
    const finalStatus = newParams.status || statusFilter
    if (Number(finalPage) > 1) params.set('page', String(finalPage))
    if (finalStatus !== 'all') params.set('status', String(finalStatus))
    return `/merchant-dashboard/orders?${params.toString()}`
  }

  return (
    <div className="space-y-6 p-1 md:p-2">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Daftar Pesanan</h2>
        <p className="text-muted-foreground">Pantau pesanan masuk, proses pengiriman, dan riwayat transaksi.</p>
      </div>

      {/* STATS CARDS - UPDATED to Separate Process (Paid) and Packed */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perlu Proses</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{paidCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Pesanan Baru (Paid)</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dikemas</CardTitle>
            <Package className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{packedCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Siap Kirim (Packed)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dikirim</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{shippedCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Sedang Jalan</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selesai</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount.count || 0}</div>
            <p className="text-xs text-muted-foreground">Transaksi Sukses</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
          
          {/* TABS - Updated with specific status values */}
          <Tabs defaultValue={statusFilter} className="w-full md:w-auto overflow-x-auto">
            <TabsList>
              <TabsTrigger value="all" asChild>
                <Link href={buildLink({ status: 'all', page: 1 })}>Semua</Link>
              </TabsTrigger>
              
              <TabsTrigger value="paid" asChild>
                <Link href={buildLink({ status: 'paid', page: 1 })}>
                   Perlu Proses 
                   {(paidCount.count || 0) > 0 && <span className="ml-1.5 rounded-full bg-orange-100 text-orange-700 px-1.5 py-0.5 text-[10px]">{paidCount.count}</span>}
                </Link>
              </TabsTrigger>

              <TabsTrigger value="packed" asChild>
                <Link href={buildLink({ status: 'packed', page: 1 })}>
                   Dikemas
                   {(packedCount.count || 0) > 0 && <span className="ml-1.5 rounded-full bg-indigo-100 text-indigo-700 px-1.5 py-0.5 text-[10px]">{packedCount.count}</span>}
                </Link>
              </TabsTrigger>
              
              <TabsTrigger value="shipped" asChild>
                <Link href={buildLink({ status: 'shipped', page: 1 })}>
                  Dikirim
                  {(shippedCount.count || 0) > 0 && <span className="ml-1.5 rounded-full bg-blue-100 text-blue-700 px-1.5 py-0.5 text-[10px]">{shippedCount.count}</span>}
                </Link>
              </TabsTrigger>
              
              <TabsTrigger value="completed" asChild>
                <Link href={buildLink({ status: 'completed', page: 1 })}>Selesai</Link>
              </TabsTrigger>
              
              <TabsTrigger value="cancelled" asChild>
                <Link href={buildLink({ status: 'cancelled', page: 1 })}>Batal</Link>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="flex items-center gap-2 w-full md:w-auto">
             <OrderSearch />
             <ExportButton data={exportData} filename="orders_report" label="Export" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Order ID</TableHead>
                <TableHead>Pembeli</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pengiriman</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center gap-2">
                         <Search className="h-8 w-8 opacity-20" />
                         <p>Tidak ada pesanan ditemukan pada status ini.</p>
                      </div>
                   </TableCell>
                 </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      #{order.id.slice(0, 8)}
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {new Date(order.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short' })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{order.buyer?.full_name || "Guest"}</span>
                        <span className="text-xs text-muted-foreground">{order.buyer?.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      Rp {order.total_amount.toLocaleString("id-ID")}
                      {order.payment && (
                         <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Banknote className="h-3 w-3" />
                            <span className="uppercase">{order.payment.payment_type?.replace('_', ' ')}</span>
                         </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                         {order.delivery_method === 'pickup' ? (
                            <Badge variant="outline" className="text-xs">Ambil Sendiri</Badge>
                         ) : (
                            <div className="flex flex-col text-xs">
                               <span className="uppercase font-semibold text-muted-foreground">{order.courier_code || "Kurir"}</span>
                               <span>{order.courier_service}</span>
                            </div>
                         )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        order.status === 'completed' ? 'default' :
                        order.status === 'cancelled' ? 'destructive' :
                        order.status === 'shipped' ? 'secondary' : 
                        order.status === 'paid' ? 'outline' : 
                        order.status === 'packed' ? 'secondary' : 'outline'
                      } className={
                        order.status === 'paid' ? "border-orange-500 text-orange-600 bg-orange-50 hover:bg-orange-100" : 
                        order.status === 'packed' ? "border-indigo-500 text-indigo-600 bg-indigo-50 hover:bg-indigo-100" : 
                        "capitalize"
                      }>
                        {order.status === 'paid' ? 'Perlu Proses' : order.status === 'packed' ? 'Dikemas' : order.status}
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

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
             Menampilkan <b>{orders.length > 0 ? start + 1 : 0}</b> - <b>{Math.min(end + 1, totalCount)}</b> dari <b>{totalCount}</b> pesanan
          </div>
          {totalPages > 1 && (
            <Pagination className="justify-center md:justify-end w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href={hasPrev ? buildLink({ page: currentPage - 1 }) : "#"} aria-disabled={!hasPrev} className={!hasPrev ? "pointer-events-none opacity-50" : ""} />
                </PaginationItem>
                <PaginationItem><PaginationLink href="#" isActive>{currentPage}</PaginationLink></PaginationItem>
                <PaginationItem>
                  <PaginationNext href={hasNext ? buildLink({ page: currentPage + 1 }) : "#"} aria-disabled={!hasNext} className={!hasNext ? "pointer-events-none opacity-50" : ""} />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  )
}