import { createAdminClient } from "@/utils/supabase/admin"
import { getPlatformSettings } from "@/utils/get-settings"
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  DollarSign, 
  Store, 
  Users, 
  Wallet, 
  AlertCircle,
  UserPlus,
  Percent,
  CheckCircle,
  TrendingUp,
  XCircle,
  Activity
} from "lucide-react"
import Link from "next/link"

// IMPORT THE NEW CHART COMPONENT
import { PlatformTrendChart } from "@/components/admin/platform-trend-chart"

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const supabase = createAdminClient()
  const settings = await getPlatformSettings()

  // 1. DETERMINE DATE RANGE
  const range = (searchParams?.range as string) || "30d"
  const now = new Date()
  let startDate = new Date()

  switch (range) {
    case "7d":
      startDate.setDate(now.getDate() - 7)
      break
    case "90d":
      startDate.setDate(now.getDate() - 90)
      break
    case "year":
      startDate.setFullYear(now.getFullYear(), 0, 1)
      break
    case "30d":
    default:
      startDate.setDate(now.getDate() - 30)
      break
  }

  // --- PARALLEL FETCHING ---
  const [
    revenueRes,
    pendingMerchantsRes,
    activeMerchantsCount,
    usersCount,
    pendingWithdrawalsRes,
    recentUsersRes,
    orderStatsRes,
    chartDataRes 
  ] = await Promise.all([
    supabase.from("orders").select("total_amount").eq("status", "completed"),
    supabase.from("organizations").select("id, name, created_at, slug").eq("status", "pending").order("created_at", { ascending: false }).limit(5),
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("withdrawals").select("amount").eq("status", "requested"),
    supabase.from("profiles").select("full_name, email, role, created_at, avatar_url").order("created_at", { ascending: false }).limit(5),
    supabase.from("orders").select("status"),
    // Fetch orders based on DYNAMIC startDate for the Chart
    supabase
      .from("orders")
      .select("created_at, total_amount")
      .gte("created_at", startDate.toISOString())
      .order("created_at", { ascending: true })
  ])

  // --- CHART DATA PROCESSING ---
  const rawChartData = chartDataRes.data || []
  
  // Helper: Format dates for Indonesia
  const formatDate = (date: Date, type: 'day' | 'month') => {
    return type === 'day' 
      ? date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) 
      : date.toLocaleDateString("id-ID", { month: "short" })
  }

  const isYearView = range === "year"
  
  const groupedData = rawChartData.reduce((acc: any, order) => {
    const d = new Date(order.created_at)
    const key = isYearView 
      ? `${d.getFullYear()}-${d.getMonth()}` 
      : d.toISOString().split('T')[0]

    if (!acc[key]) {
      acc[key] = { 
        sortDate: d,
        label: formatDate(d, isYearView ? 'month' : 'day'), 
        // Full date string for the Tooltip header
        date: isYearView 
            ? d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }) 
            : d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "short" }),
        orders: 0, 
        revenue: 0 
      }
    }
    acc[key].orders += 1
    acc[key].revenue += order.total_amount
    return acc
  }, {})

  const chartData = Object.values(groupedData).sort((a: any, b: any) => 
    a.sortDate.getTime() - b.sortDate.getTime()
  ) as any[]


  // --- REST OF CALCULATIONS ---
  const completedOrders = revenueRes.data || []
  const grossSales = completedOrders.reduce((acc, order) => acc + order.total_amount, 0)
  const feePercent = Number(settings.transaction_fee_percent) || 0
  const platformRevenue = Math.round(grossSales * (feePercent / 100))

  const allOrders = orderStatsRes.data || []
  const totalOrderCount = allOrders.length
  const completedOrderCount = allOrders.filter(o => o.status === 'completed').length
  const cancelledOrderCount = allOrders.filter(o => o.status === 'cancelled').length
  const successRate = totalOrderCount > 0 ? Math.round((completedOrderCount / totalOrderCount) * 100) : 0
  const averageOrderValue = completedOrders.length > 0 ? Math.round(grossSales / completedOrders.length) : 0
  
  const pendingMerchants = pendingMerchantsRes.data || []
  const activeCount = activeMerchantsCount.count || 0
  const totalUsers = usersCount.count || 0
  const pendingWithdrawals = pendingWithdrawalsRes.data || []
  const totalPendingPayout = pendingWithdrawals.reduce((acc, w) => acc + w.amount, 0)
  const pendingPayoutCount = pendingWithdrawals.length
  const recentUsers = recentUsersRes.data || []

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Superadmin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform Health: <b>{successRate}% Success Rate</b> • Fee: <b>{feePercent}%</b>
          </p>
        </div>
        <div className="flex gap-2">
           <Button asChild variant="outline" size="sm">
              <Link href="/admin/finance">
                 <Wallet className="mr-2 h-4 w-4" /> Finance
              </Link>
           </Button>
           <Button asChild size="sm">
              <Link href="/admin/merchants">
                 <Store className="mr-2 h-4 w-4" /> Manage Merchants
              </Link>
           </Button>
        </div>
      </div>

      {/* SECTION 1: METRICS */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Net Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">Rp {platformRevenue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <Percent className="h-3 w-3 mr-1" /> {feePercent}% of Rp {grossSales.toLocaleString("id-ID")} GMV
            </p>
          </CardContent>
        </Card>

        <Card className={totalPendingPayout > 0 ? "border-l-4 border-l-orange-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Wallet className={`h-4 w-4 ${totalPendingPayout > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalPendingPayout.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingPayoutCount} withdrawal requests
            </p>
          </CardContent>
        </Card>

         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Order Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {averageOrderValue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              From {completedOrders.length} completed orders
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ecosystem</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers} <span className="text-sm font-normal text-muted-foreground">users</span></div>
            <p className="text-xs text-muted-foreground mt-1">
              {activeCount} active merchants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 2: QUEUES & HEALTH */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Merchant Approvals (3/7) */}
        <Card className="col-span-1 md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" /> Merchant Approvals
            </CardTitle>
            <CardDescription>Stores waiting for verification.</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingMerchants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p>All caught up!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingMerchants.map((merchant) => (
                  <div key={merchant.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                        <Store className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{merchant.name}</p>
                        <p className="text-xs text-muted-foreground">/{merchant.slug}</p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/admin/merchants?id=${merchant.id}`}>Review</Link>
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Health (2/7) */}
        <Card className="col-span-1 md:col-span-1 lg:col-span-2 flex flex-col">
           <CardHeader>
              <CardTitle className="flex items-center gap-2">
                 <Activity className="h-5 w-5 text-indigo-500" /> Order Health
              </CardTitle>
              <CardDescription>All time order status.</CardDescription>
           </CardHeader>
           <CardContent className="flex-1 space-y-6">
              <div className="space-y-2">
                 <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                       <CheckCircle className="h-4 w-4 text-green-500" /> Completed
                    </span>
                    <span className="font-bold">{completedOrderCount}</span>
                 </div>
                 <Progress 
                    value={successRate} 
                    className="h-2 bg-green-100" 
                    indicatorClassName="bg-green-500" 
                 />
              </div>
              <div className="space-y-2">
                 <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                       <XCircle className="h-4 w-4 text-red-500" /> Cancelled
                    </span>
                    <span className="font-bold">{cancelledOrderCount}</span>
                 </div>
                 <Progress 
                    value={totalOrderCount > 0 ? (cancelledOrderCount / totalOrderCount) * 100 : 0} 
                    className="h-2 bg-red-100" 
                    indicatorClassName="bg-red-500" 
                 />
              </div>
           </CardContent>
        </Card>

        {/* New Users (2/7) */}
        <Card className="col-span-1 md:col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" /> New Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {recentUsers.map((user, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback className="text-[10px]">
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1 overflow-hidden">
                      <p className="text-sm font-medium leading-none truncate max-w-[120px]">{user.full_name || "No Name"}</p>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant={user.role === 'super_admin' ? "default" : "secondary"} className="text-[10px]">
                    {user.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SECTION 3: REVENUE TREND CHART */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
         {/* Pass the dynamic data and the current range selection */}
         <PlatformTrendChart data={chartData} currentRange={range} />
      </div>

    </div>
  )
}