import { createClient } from "@/utils/supabase/server"
import { CouponClient } from "./coupon-client"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Import Card
import { TicketPercent, CheckCircle, Repeat, Clock } from "lucide-react" // Import Icons

export default async function CouponsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: member } = await supabase.from("organization_members").select("org_id").eq("profile_id", user.id).single()
  
  if (!member) redirect("/")

  // Fetch Coupons
  const { data: coupons } = await supabase
    .from("coupons")
    .select("*")
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: false })

  const safeCoupons = coupons || []

  // --- STATS CALCULATION ---
  const totalCoupons = safeCoupons.length
  
  // Kupon Aktif = Status True AND Tanggal Expire masih di masa depan
  const activeCount = safeCoupons.filter(c => {
    const isNotExpired = new Date(c.expires_at) > new Date()
    return c.is_active && isNotExpired
  }).length

  // Total Pemakaian = Sum of times_used
  const totalUsage = safeCoupons.reduce((acc, c) => acc + c.times_used, 0)

  // Kupon Kadaluarsa
  const expiredCount = safeCoupons.filter(c => new Date(c.expires_at) < new Date()).length

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Kupon Diskon</h2>
        <p className="text-muted-foreground">Buat dan kelola kode promo untuk menarik pelanggan.</p>
      </div>

      {/* 2. Stats Cards Section (New) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kupon Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Siap digunakan pembeli</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Kupon</CardTitle>
            <TicketPercent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoupons}</div>
            <p className="text-xs text-muted-foreground">Semua riwayat promo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pemakaian</CardTitle>
            <Repeat className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalUsage}x</div>
            <p className="text-xs text-muted-foreground">Klaim oleh pembeli</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kadaluarsa</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{expiredCount}</div>
            <p className="text-xs text-muted-foreground">Promo berakhir</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Interactive List (Client Component) */}
      <CouponClient coupons={safeCoupons} orgId={member.org_id} />
    </div>
  )
}