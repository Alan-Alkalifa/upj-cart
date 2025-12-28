import { createClient } from "@/utils/supabase/server"
import { getPlatformSettings } from "@/utils/get-settings"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils" // Pastikan import utility cn
import { 
  DollarSign, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  ArrowRight, 
  Plus, 
  TrendingUp,
  Info,
  CalendarDays
} from "lucide-react"

// Helper format tanggal pendek (misal: 1 Jan)
const formatDateShort = (date: Date) => {
  return new Intl.DateTimeFormat("id-ID", { day: 'numeric', month: 'short' }).format(date)
}

export default async function DashboardPage(props: { searchParams: Promise<{ trend?: string }> }) {
  const searchParams = await props.searchParams
  const trendFilter = searchParams.trend || "week" // default: week

  const supabase = await createClient()
  const settings = await getPlatformSettings()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 1. Get Org ID
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(name)")
    .eq("profile_id", user.id)
    .single()
  
  if (!member) redirect("/")

  const orgId = member.org_id
  const rawOrg = member.organizations
  const orgData: any = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg
  const orgName = orgData?.name || "Toko Saya"

  // --- LOGIC: DATE RANGE & GROUPING ---
  const now = new Date()
  let startDate = new Date()
  let dateFormat: "day" | "month" = "day"
  let chartLabels: string[] = []
  let dateRangeLabel = ""

  if (trendFilter === "year") {
    // Tahun Ini (Jan - Dec)
    startDate = new Date(now.getFullYear(), 0, 1) // 1 Jan tahun ini
    dateFormat = "month"
    dateRangeLabel = `Tahun ${now.getFullYear()}`
    
    chartLabels = Array.from({ length: 12 }, (_, i) => {
       const d = new Date(now.getFullYear(), i, 1)
       return d.toISOString().slice(0, 7) // YYYY-MM
    })
  } else if (trendFilter === "month") {
    // 30 Hari Terakhir
    startDate.setDate(now.getDate() - 29) 
    startDate.setHours(0,0,0,0)
    dateFormat = "day"
    dateRangeLabel = `${formatDateShort(startDate)} - ${formatDateShort(now)} ${now.getFullYear()}`

    chartLabels = Array.from({ length: 30 }, (_, i) => {
       const d = new Date(startDate)
       d.setDate(d.getDate() + i)
       return d.toISOString().split('T')[0] 
    })
  } else {
    // Default: 7 Hari Terakhir
    startDate.setDate(now.getDate() - 6)
    startDate.setHours(0,0,0,0)
    dateFormat = "day"
    dateRangeLabel = `${formatDateShort(startDate)} - ${formatDateShort(now)} ${now.getFullYear()}`

    chartLabels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      return d.toISOString().split('T')[0]
    })
  }

  // 2. Fetch Data Parallel
  const [productsRes, revenueItemsRes, recentOrdersRes] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, is_active, is_active, product_variants(stock)")
      .eq("org_id", orgId)
      .is("deleted_at", null),

    supabase
      .from("order_items")
      .select("price_at_purchase, quantity, orders!inner(status, created_at)")
      .eq("product_variants.products.org_id", orgId)
      .eq("orders.status", "completed")
      .gte("orders.created_at", startDate.toISOString()), 

    supabase
      .from("order_items")
      .select(`
        order_id,
        orders!inner (
          id, status, total_amount, created_at,
          profiles (full_name, avatar_url)
        )
      `)
      .eq("product_variants.products.org_id", orgId)
      .order("created_at", { ascending: false, referencedTable: "orders" })
      .limit(5)
  ])
  
  // Pending Orders Count
  const { count: pendingOrdersCount } = await supabase
     .from("order_items")
     .select("orders!inner(status)", { count: 'exact', head: true })
     .eq("product_variants.products.org_id", orgId)
     .in("orders.status", ['paid', 'packed'])

  const products = productsRes.data || []
  const revenueItems = revenueItemsRes.data || []
  
  // Deduplicate Recent Orders
  const uniqueRecentOrders = new Map()
  recentOrdersRes.data?.forEach((item: any) => {
    if (item.orders) uniqueRecentOrders.set(item.orders.id, item.orders)
  })
  const recentOrders = Array.from(uniqueRecentOrders.values()).slice(0, 5)

  // --- STATS CALCULATION ---
  const feePercent = Number(settings.transaction_fee_percent) || 0

  const grossRevenue = revenueItems.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0)
  const platformFee = Math.round(grossRevenue * (feePercent / 100))
  const netRevenue = grossRevenue - platformFee

  const activeProductsCount = products.filter(p => p.is_active).length
  const lowStockProducts = products.filter(p => {
    const totalStock = p.product_variants.reduce((acc: number, v: any) => acc + v.stock, 0)
    return totalStock < 5
  })

  // Chart Data
  const chartData = chartLabels.map(labelKey => {
    const matchingItems = revenueItems.filter((item: any) => {
      const itemDate = item.orders.created_at
      return dateFormat === 'month' ? itemDate.startsWith(labelKey) : itemDate.startsWith(labelKey)
    })

    const dailyGross = matchingItems.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0)
    const dailyNet = dailyGross - Math.round(dailyGross * (feePercent / 100))

    return { 
      date: labelKey, 
      value: dailyNet,
      displayLabel: dateFormat === 'month' 
        ? new Intl.DateTimeFormat("id-ID", { month: 'short' }).format(new Date(labelKey + "-01"))
        : new Intl.DateTimeFormat("id-ID", { weekday: trendFilter === 'month' ? undefined : 'short', day: 'numeric' }).format(new Date(labelKey))
    }
  })
  
  const maxChartValue = Math.max(...chartData.map(d => d.value), 100) 

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
          <p className="text-muted-foreground">
             Halo, selamat datang kembali di toko <b>{orgName}</b>.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild>
            <Link href="/merchant/products/create">
              <Plus className="mr-2 h-4 w-4" /> Tambah Produk
            </Link>
          </Button>
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Pendapatan Bersih
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total penjualan bersih (dikurangi biaya admin) dalam periode ini.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">Rp {netRevenue.toLocaleString("id-ID")}</div>
            <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
              <CalendarDays className="h-3 w-3" />
              <span>{dateRangeLabel}</span>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pesanan Baru</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrdersCount || 0}</div>
            <p className="text-xs text-muted-foreground">Perlu dikirim segera</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProductsCount}</div>
            <p className="text-xs text-muted-foreground">Dari {products.length} total produk</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">Varian kurang dari 5 pcs</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* REVENUE CHART */}
        <div className="col-span-4 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="space-y-1">
                <CardTitle className="text-base">Tren Pendapatan</CardTitle>
                <CardDescription className="text-xs">
                   {dateRangeLabel}
                </CardDescription>
              </div>
              
              {/* SEGMENTED CONTROL FILTER */}
              <div className="flex items-center p-1 bg-muted/80 rounded-lg border">
                <FilterTab 
                  active={trendFilter === 'week'} 
                  href="/merchant?trend=week" 
                  label="Mingguan" 
                />
                <FilterTab 
                  active={trendFilter === 'month'} 
                  href="/merchant?trend=month" 
                  label="Bulanan" 
                />
                <FilterTab 
                  active={trendFilter === 'year'} 
                  href="/merchant?trend=year" 
                  label="Tahunan" 
                />
              </div>
            </CardHeader>
            <CardContent className="pl-2 pt-4">
              <div className="flex h-64 items-end justify-between gap-2 px-4">
                {chartData.map((d) => (
                  <div key={d.date} className="group relative flex w-full flex-col items-center gap-2 h-full justify-end">
                    {/* Bar */}
                    <div 
                      className={cn(
                        "w-full rounded-t-sm transition-all duration-500 ease-out min-h-[4px]",
                        d.value > 0 ? "bg-green-500 hover:bg-green-600" : "bg-muted"
                      )}
                      style={{ height: `${d.value > 0 ? (d.value / maxChartValue) * 100 : 2}%` }}
                    ></div>
                    
                    {/* Label Sumbu X */}
                    <span className={cn(
                      "text-[10px] text-muted-foreground truncate w-full text-center",
                      trendFilter === 'month' && parseInt(d.date.split('-')[2]) % 3 !== 0 ? 'hidden sm:block opacity-50' : 'block'
                    )}>
                      {d.displayLabel}
                    </span>

                    {/* Tooltip Hover */}
                    <div className="absolute bottom-full mb-2 hidden flex-col items-center rounded-md bg-popover px-2 py-1 text-xs shadow-md border group-hover:flex z-10 whitespace-nowrap">
                      <span className="font-semibold text-foreground">Rp {d.value.toLocaleString("id-ID")}</span>
                      <span className="text-[10px] text-muted-foreground">{d.date}</span>
                      <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-popover border-b border-r"></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-span-3 space-y-4">
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Pesanan Terbaru</CardTitle>
              <CardDescription>
                5 transaksi terakhir yang masuk.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentOrders.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8 border border-dashed rounded-lg">
                    Belum ada pesanan masuk.
                  </div>
                )}
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border">
                        <AvatarImage src={order.profiles?.avatar_url} />
                        <AvatarFallback>{order.profiles?.full_name?.[0] || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{order.profiles?.full_name}</p>
                        <p className="text-xs text-muted-foreground">#{order.id.slice(0,8)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">+Rp {order.total_amount.toLocaleString("id-ID")}</div>
                      <Badge variant="outline" className={cn(
                        "text-[10px] h-5 px-1.5 capitalize mt-1",
                        order.status === 'paid' && "bg-green-50 text-green-700 border-green-200",
                        order.status === 'completed' && "bg-blue-50 text-blue-700 border-blue-200"
                      )}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t">
                <Button asChild variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground">
                  <Link href="/merchant/orders">
                    Lihat Semua Pesanan <ArrowRight className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Komponen Kecil untuk Tab Filter (UX Improvement)
function FilterTab({ active, href, label }: { active: boolean, href: string, label: string }) {
  return (
    <Link 
      href={href}
      className={cn(
        "px-3 py-1 text-xs font-medium rounded-md transition-all duration-200",
        active 
          ? "bg-background text-foreground shadow-sm ring-1 ring-black/5" 
          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
      )}
    >
      {label}
    </Link>
  )
}