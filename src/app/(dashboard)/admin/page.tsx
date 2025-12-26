import { createAdminClient } from "@/utils/supabase/admin"
import { getPlatformSettings } from "@/utils/get-settings" // Import Settings
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  DollarSign, 
  Store, 
  Users, 
  Wallet, 
  ArrowRight, 
  AlertCircle,
  UserPlus,
  Percent,
  CheckCircle
} from "lucide-react"
import Link from "next/link"

export default async function AdminDashboardPage() {
  const supabase = createAdminClient()
  const settings = await getPlatformSettings() // Get Fee Configuration

  // --- PARALLEL FETCHING ---
  const [
    revenueRes,
    pendingMerchantsRes,
    activeMerchantsCount,
    usersCount,
    pendingWithdrawalsRes,
    recentUsersRes
  ] = await Promise.all([
    // 1. Total Gross Revenue (Completed Orders Only)
    supabase.from("orders").select("total_amount").eq("status", "completed"),

    // 2. Pending Merchants (Data limit 5)
    supabase
      .from("organizations")
      .select("id, name, created_at, slug")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),

    // 3. Active Merchants Count
    supabase.from("organizations").select("id", { count: "exact", head: true }).eq("status", "active"),

    // 4. Total Users Count
    supabase.from("profiles").select("id", { count: "exact", head: true }),

    // 5. Pending Withdrawals (Liabilities)
    supabase
      .from("withdrawals")
      .select("amount")
      .eq("status", "requested"),

    // 6. Recent Users (Activity Log)
    supabase
      .from("profiles")
      .select("full_name, email, role, created_at, avatar_url")
      .order("created_at", { ascending: false })
      .limit(5)
  ])

  // --- REVENUE CALCULATION (NEW RULES) ---
  const grossSales = revenueRes.data?.reduce((acc, order) => acc + order.total_amount, 0) || 0
  
  // Calculate Platform Revenue (Admin's Profit)
  const feePercent = Number(settings.transaction_fee_percent) || 0
  const platformRevenue = Math.round(grossSales * (feePercent / 100))

  // --- COUNTS & DATA ---
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
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            Platform Fee current rate: <b>{feePercent}%</b>. Total GMV: <b>Rp {grossSales.toLocaleString("id-ID")}</b>.
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

      {/* --- SECTION 1: STATS CARDS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        
        {/* CARD 1: PLATFORM REVENUE (NET) */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Net Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">Rp {platformRevenue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <Percent className="h-3 w-3 mr-1" /> {feePercent}% from Total Sales
            </p>
          </CardContent>
        </Card>

        {/* CARD 2: PENDING PAYOUTS (LIABILITY) */}
        <Card className={totalPendingPayout > 0 ? "border-l-4 border-l-orange-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liabilities (Withdrawals)</CardTitle>
            <Wallet className={`h-4 w-4 ${totalPendingPayout > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalPendingPayout.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingPayoutCount} requests waiting
            </p>
          </CardContent>
        </Card>

        {/* CARD 3: ACTIVE MERCHANTS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Merchants</CardTitle>
            <Store className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Operating stores</p>
          </CardContent>
        </Card>

        {/* CARD 4: TOTAL USERS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Buyers & Merchants</p>
          </CardContent>
        </Card>
      </div>

      {/* --- SECTION 2: LISTS --- */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* LEFT COLUMN (ACTION REQUIRED) - SPAN 4 */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" /> Merchant Queue
            </CardTitle>
            <CardDescription>
              New stores waiting for admin verification.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingMerchants.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
                <p>No pending queue.</p>
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
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                        Pending
                      </Badge>
                      <Button size="icon" variant="ghost" asChild>
                        <Link href={`/admin/merchants?tab=pending`}>
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="link" className="w-full" asChild>
                  <Link href="/admin/merchants">View All Queue</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RIGHT COLUMN (RECENT USERS) - SPAN 3 */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-500" /> Recent Signups
            </CardTitle>
            <CardDescription>
              Users who just joined.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentUsers.map((user, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={user.avatar_url || ""} />
                      <AvatarFallback className="text-xs">
                        {user.full_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{user.full_name || "No Name"}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {user.role}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}