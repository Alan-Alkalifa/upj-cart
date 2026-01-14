import { createAdminClient } from "@/utils/supabase/admin"
import { OrderSearch } from "./order-search"
import { OrderActions } from "./order-actions"
import { MonthFilter } from "./moth-filters" // [FIX] Typo fixed
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious
} from "@/components/ui/pagination"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { Package, Clock, CheckCircle, XCircle, ShoppingBag } from "lucide-react"

export default async function AdminOrdersPage(props: { 
  searchParams: Promise<{ page?: string, status?: string, q?: string, month?: string }> 
}) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  const statusFilter = searchParams.status || "all"
  const searchQuery = searchParams.q || ""
  
  // LOGIC BARU: 
  // 1. Ambil param. 
  // 2. Jika "all", maka filter kosong (semua waktu).
  // 3. Jika kosong/undefined, default ke Bulan Ini.
  const rawMonthParam = searchParams.month
  let activeMonthFilter = ""

  if (rawMonthParam === "all") {
    activeMonthFilter = "" // Tampilkan semua
  } else if (!rawMonthParam) {
    // Default ke bulan ini (YYYY-MM)
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    activeMonthFilter = `${year}-${month}`
  } else {
    activeMonthFilter = rawMonthParam 
  }
  
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage - 1

  const supabase = createAdminClient()

  // --- HELPER: Apply Date Filter ---
  const applyDateFilter = (query: any) => {
    if (activeMonthFilter) {
      const [year, month] = activeMonthFilter.split('-').map(Number)
      const lastDay = new Date(year, month, 0).getDate()
      
      const startDate = `${activeMonthFilter}-01T00:00:00.000Z`
      const endDate = `${activeMonthFilter}-${lastDay}T23:59:59.999Z`

      return query.gte('created_at', startDate).lte('created_at', endDate)
    }
    return query
  }

  // --- 1. Query Utama (Tabel) ---
  let mainQuery = supabase
    .from("orders")
    .select(`
      *,
      profiles ( full_name, email ),
      organizations ( name, slug ),
      user_addresses ( city )
    `, { count: 'exact' })
    .order("created_at", { ascending: false })

  if (statusFilter !== 'all') {
    // [FIX] Cast statusFilter to any to satisfy specific Enum type
    mainQuery = mainQuery.eq('status', statusFilter as any)
  }
  if (searchQuery) {
    mainQuery = mainQuery.eq('id', searchQuery)
  }
  mainQuery = applyDateFilter(mainQuery)

  // --- 2. Query Statistik (Stats Cards) ---
  const getStatsQuery = (status?: string | string[]) => {
    let q = supabase.from("orders").select("id", { count: 'exact', head: true })
    q = applyDateFilter(q) // Ikuti filter aktif
    
    if (status) {
      if (Array.isArray(status)) {
        // [FIX] Cast status array to any
        q = q.in("status", status as any)
      } else {
        // [FIX] Cast status string to any
        q = q.eq("status", status as any)
      }
    }
    return q
  }

  // --- 3. Fetch Data ---
  const [
    ordersRes,
    allOrdersCount,
    completedCount,
    cancelledCount,
    activeCount
  ] = await Promise.all([
    mainQuery.range(start, end),
    getStatsQuery(), 
    getStatsQuery("completed"),
    getStatsQuery("cancelled"),
    getStatsQuery(["paid", "packed", "shipped"])
  ])

  const orders = ordersRes.data || []
  const totalCount = ordersRes.count || 0
  const totalPages = Math.ceil(totalCount / perPage)

  const counts = {
    all: allOrdersCount.count || 0,
    completed: completedCount.count || 0,
    cancelled: cancelledCount.count || 0,
    active: activeCount.count || 0
  }

  // Helper Link Builder (Keep params consistent)
  const buildLink = (newParams: Record<string, string | number>) => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    // Jika rawMonthParam ada (termasuk 'all'), kita pertahankan di pagination
    // Jika tidak ada (default), biarkan kosong agar tetap default
    if (rawMonthParam) params.set('month', rawMonthParam)
    
    const finalPage = newParams.page || 1
    const finalStatus = newParams.status || statusFilter

    params.set('page', String(finalPage))
    params.set('status', String(finalStatus))
    
    return `/admin-dashboard/orders?${params.toString()}`
  }

  return (
    <div className="space-y-6">
       <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Pesanan</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <p>Pantau seluruh transaksi platform.</p>
          {activeMonthFilter ? (
            <Badge variant="secondary" className="font-normal text-xs">
              Periode: {new Date(activeMonthFilter + "-01").toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
            </Badge>
          ) : (
            <Badge variant="outline" className="font-normal text-xs">
              Periode: Semua Waktu
            </Badge>
          )}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard 
          title={activeMonthFilter ? "Total Order (Bulan Ini)" : "Total Order (Semua)"} 
          count={counts.all} 
          icon={<ShoppingBag className="text-blue-500" />} 
        />
        <SummaryCard title="Aktif/Proses" count={counts.active} icon={<Clock className="text-orange-500" />} />
        <SummaryCard title="Selesai" count={counts.completed} icon={<CheckCircle className="text-green-600" />} />
        <SummaryCard title="Batal/Refund" count={counts.cancelled} icon={<XCircle className="text-destructive" />} />
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
         <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full md:w-auto overflow-x-auto">
          <TabLink href={buildLink({ status: 'all', page: 1 })} active={statusFilter === 'all'} label="Semua" />
          <TabLink href={buildLink({ status: 'completed', page: 1 })} active={statusFilter === 'completed'} label="Selesai" />
          <TabLink href={buildLink({ status: 'cancelled', page: 1 })} active={statusFilter === 'cancelled'} label="Batal" />
        </div>

        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <MonthFilter />
          <OrderSearch />
        </div>
      </div>

      {/* TABLE CONTENT */}
      <Card>
        <CardHeader>
             <CardTitle className="capitalize flex justify-between items-center">
                <span>
                  {statusFilter === 'all' ? 'Daftar Pesanan' : 
                   statusFilter === 'completed' ? 'Pesanan Selesai' : 
                   statusFilter === 'cancelled' ? 'Pesanan Dibatalkan' : 'Daftar Pesanan'}
                </span>
             </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Order ID</TableHead>
                    <TableHead>Pembeli</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {orders.length === 0 ? (
                    <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <ShoppingBag className="h-8 w-8 opacity-20" />
                          <p>Tidak ada data pesanan.</p>
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
                            <span className="font-medium text-sm">{order.profiles?.full_name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">{order.profiles?.email}</span>
                        </div>
                        </TableCell>
                        <TableCell>
                        <div className="flex items-center gap-2">
                            <Package className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{order.organizations?.name}</span>
                        </div>
                        </TableCell>
                        <TableCell className="font-medium">
                        Rp {order.total_amount.toLocaleString("id-ID")}
                        </TableCell>
                        <TableCell>
                        <Badge variant={
                            order.status === 'completed' ? 'default' :
                            order.status === 'cancelled' ? 'destructive' :
                            order.status === 'shipped' ? 'secondary' : 'outline'
                        } className="capitalize">
                            {order.status}
                        </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                        {new Date(order.created_at).toLocaleDateString("id-ID")}
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

          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
             <div className="text-sm text-muted-foreground">
               Menampilkan {orders.length > 0 ? start + 1 : 0} - {Math.min(end + 1, totalCount)} dari {totalCount} pesanan
            </div>
            {totalPages > 1 && (
                <Pagination className="justify-end w-auto mx-0">
                <PaginationContent>
                    <PaginationItem>
                    <PaginationPrevious 
                        href={currentPage > 1 ? buildLink({ page: currentPage - 1 }) : "#"}
                        className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                    </PaginationItem>
                    <PaginationItem>
                        <PaginationLink href="#" isActive>{currentPage}</PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                    <PaginationNext 
                        href={currentPage < totalPages ? buildLink({ page: currentPage + 1 }) : "#"}
                        className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
                    />
                    </PaginationItem>
                </PaginationContent>
                </Pagination>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function SummaryCard({ title, count, icon }: { title: string, count: number, icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4">{icon}</div>
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
    </Card>
  )
}

function TabLink({ active, href, label }: { active: boolean, href: string, label: string }) {
  return (
    <Link href={href} className={cn(
      "inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all whitespace-nowrap",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    )}>{label}</Link>
  )
}