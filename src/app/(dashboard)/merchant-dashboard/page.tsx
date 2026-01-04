import { createClient } from "@/utils/supabase/server"
import { getPlatformSettings } from "@/utils/get-settings" // Import Settings
import { redirect } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { 
  DollarSign, 
  ShoppingBag, 
  Package, 
  AlertTriangle, 
  ArrowRight, 
  Plus, 
  TrendingUp,
  Info
} from "lucide-react"

export default async function DashboardPage() {
  const supabase = await createClient()
  const settings = await getPlatformSettings() // Get Fee Configuration

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

  // Normalize Organization Data
  const rawOrg = member.organizations
  const orgData: any = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg
  const orgName = orgData?.name || "Toko Saya"

  // 2. Fetch Data Parallel
  const [productsRes, ordersRes, recentOrdersRes] = await Promise.all([
    // A. Fetch Products
    supabase
      .from("products")
      .select("id, name, is_active, image_url, base_price, product_variants(stock)")
      .eq("org_id", orgId)
      .is("deleted_at", null),

    // B. Fetch All Orders (For Revenue)
    supabase
      .from("order_items")
      .select("price_at_purchase, quantity, orders!inner(status, created_at, total_amount)")
      .eq("product_variants.products.org_id", orgId), 

    // C. Fetch Recent Orders (Limit 5)
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

  const products = productsRes.data || []
  const allOrderItems = ordersRes.data || []
  
  // Deduplicate Recent Orders
  const uniqueRecentOrders = new Map()
  recentOrdersRes.data?.forEach((item: any) => {
    if (item.orders) uniqueRecentOrders.set(item.orders.id, item.orders)
  })
  const recentOrders = Array.from(uniqueRecentOrders.values()).slice(0, 5)

  // --- STATS CALCULATION (NEW LOGIC) ---
  
  // 1. Revenue Calculation (Net = Gross - Fee)
  const grossRevenue = allOrderItems
    .filter((item: any) => item.orders.status === 'completed')
    .reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0)

  const feePercent = Number(settings.transaction_fee_percent) || 0
  const platformFee = Math.round(grossRevenue * (feePercent / 100))
  const netRevenue = grossRevenue - platformFee

  // 2. Pesanan Baru
  const pendingItems = allOrderItems.filter((item: any) => ['paid', 'packed'].includes(item.orders.status))
  const pendingOrdersCount = new Set(pendingItems.map((i:any) => i.orders)).size 

  // 3. Produk Stats
  const activeProductsCount = products.filter(p => p.is_active).length
  const lowStockProducts = products.filter(p => {
    const totalStock = p.product_variants.reduce((acc: number, v: any) => acc + v.stock, 0)
    return totalStock < 5
  })

  // 4. Chart Data (Net Revenue per Day)
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  }).reverse()

  const chartData = last7Days.map(date => {
    const dailyGross = allOrderItems
      .filter((item: any) => 
        item.orders.status === 'completed' && 
        item.orders.created_at.startsWith(date)
      )
      .reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0)
    
    // Calculate Daily Net
    const dailyFee = Math.round(dailyGross * (feePercent / 100))
    const dailyNet = dailyGross - dailyFee

    return { date, value: dailyNet }
  })
  
  const maxChartValue = Math.max(...chartData.map(d => d.value), 100) 

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex items-center justify-between">
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
        
        {/* CARD 1: NET REVENUE */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Pendapatan Bersih
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total penjualan dikurangi biaya admin ({feePercent}%)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {netRevenue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Gross: Rp {grossRevenue.toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        
        {/* CARD 2: NEW ORDERS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pesanan Baru</CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrdersCount}</div>
            <p className="text-xs text-muted-foreground">Perlu dikirim segera</p>
          </CardContent>
        </Card>

        {/* CARD 3: ACTIVE PRODUCTS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProductsCount}</div>
            <p className="text-xs text-muted-foreground">Dari {products.length} total produk</p>
          </CardContent>
        </Card>

        {/* CARD 4: LOW STOCK */}
        <Card>
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
        
        {/* LEFT COLUMN: REVENUE CHART & RECENT ORDERS */}
        <div className="col-span-4 space-y-4">
          
          {/* Simple CSS Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Tren Pendapatan Bersih (7 Hari)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="flex h-50 items-end justify-between gap-2 px-4">
                {chartData.map((d) => (
                  <div key={d.date} className="group relative flex w-full flex-col items-center gap-2">
                    <div 
                      className="w-full rounded-t-md bg-green-500/80 transition-all hover:bg-green-600"
                      style={{ height: `${(d.value / maxChartValue) * 100}%` }}
                    ></div>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.date).toLocaleDateString("id-ID", { weekday: 'short' })}
                    </span>
                    {/* Tooltip */}
                    <div className="absolute -top-8 hidden rounded bg-black px-2 py-1 text-xs text-white group-hover:block z-10 whitespace-nowrap">
                      Rp {d.value.toLocaleString("id-ID")}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>Pesanan Terbaru</CardTitle>
              <CardDescription>
                5 transaksi terakhir yang masuk ke toko Anda.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                {recentOrders.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">Belum ada pesanan.</div>
                )}
                {recentOrders.map((order: any) => (
                  <div key={order.id} className="flex items-center">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={order.profiles?.avatar_url} alt="Avatar" />
                      <AvatarFallback>{order.profiles?.full_name?.[0] || "U"}</AvatarFallback>
                    </Avatar>
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{order.profiles?.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Order #{order.id.slice(0,8)}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-sm">
                      +Rp {order.total_amount.toLocaleString("id-ID")}
                    </div>
                    <Badge variant="outline" className={`ml-4 capitalize ${
                      order.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : ''
                    }`}>
                      {order.status}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="mt-6">
                <Button asChild variant="outline" className="w-full">
                  <Link href="/merchant/orders">
                    Lihat Semua Pesanan <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: QUICK ACTIONS & ALERTS */}
        <div className="col-span-3 space-y-4">
          
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Aksi Cepat</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
               <Button asChild variant="secondary" className="justify-start">
                 <Link href="/merchant-dashboard/products/create"><Plus className="mr-2 h-4 w-4" /> Tambah Produk</Link>
               </Button>
               <Button asChild variant="secondary" className="justify-start">
                 <Link href="/merchant-dashboard/orders"><ShoppingBag className="mr-2 h-4 w-4" /> Proses Pesanan</Link>
               </Button>
               <Button asChild variant="secondary" className="justify-start">
                 <Link href="/merchant-dashboard/finance"><TrendingUp className="mr-2 h-4 w-4" /> Keuangan & Penarikan</Link>
               </Button>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                 <AlertTriangle className="h-5 w-5" /> Perhatian Stok
              </CardTitle>
              <CardDescription>Produk berikut memiliki stok rendah.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockProducts.length === 0 ? (
                   <div className="text-sm text-green-600 flex items-center gap-2">
                      <Package className="h-4 w-4" /> Stok aman terkendali.
                   </div>
                ) : (
                  lowStockProducts.slice(0, 5).map(p => (
                    <div key={p.id} className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
                       <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8 rounded-md border">
                             <AvatarImage src={p.image_url} />
                             <AvatarFallback>IMG</AvatarFallback>
                          </Avatar>
                          <div className="space-y-1">
                             <p className="text-sm font-medium leading-none">{p.name}</p>
                             <p className="text-xs text-muted-foreground">Harga: Rp {p.base_price.toLocaleString("id-ID")}</p>
                          </div>
                       </div>
                       <Button asChild size="sm" variant="ghost">
                          <Link href={`/merchant/products/${p.id}`}>Edit</Link>
                       </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}