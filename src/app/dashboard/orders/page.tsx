import { createClient } from "@/utils/supabase/server"
import { OrderListClient } from "./order-list-client"
import { DateRangeFilter } from "@/components/dashboard/date-range-filter"
import { ExportButton } from "@/components/dashboard/export-button"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingBag, Truck, CheckCircle, Banknote } from "lucide-react"

// Next.js 15: props.searchParams is a Promise
export default async function OrdersPage(props: { searchParams: Promise<{ from?: string, to?: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("profile_id", user.id).single()
  if (!member) redirect("/")

  // --- QUERY BUILDER ---
  let query = supabase
    .from("order_items")
    .select(`
      order_id,
      orders!inner (
        id, status, total_amount, created_at,
        profiles (full_name, email, phone),
        user_addresses (street_address, city, postal_code),
        order_items (id, quantity)
      ),
      product_variants!inner ( products!inner ( org_id ) )
    `)
    .eq("product_variants.products.org_id", member.org_id)
    .order("created_at", { ascending: false, referencedTable: "orders" })

  // --- APPLY DATE FILTER ---
  if (searchParams.from) {
    query = query.gte("orders.created_at", searchParams.from)
  }
  if (searchParams.to) {
    // Add end of day time to ensure we capture the full day
    const toDate = new Date(searchParams.to)
    toDate.setHours(23, 59, 59)
    query = query.lte("orders.created_at", toDate.toISOString())
  }

  const { data: orderItems } = await query

  // --- DEDUPLICATE & CLEANUP ---
  const uniqueOrdersMap = new Map()
  orderItems?.forEach((item: any) => {
    if (item.orders) uniqueOrdersMap.set(item.orders.id, item.orders)
  })
  const orders = Array.from(uniqueOrdersMap.values())

  // --- PREPARE EXPORT DATA ---
  // Flatten the object for CSV
  const exportData = orders.map(o => ({
    Order_ID: o.id,
    Date: new Date(o.created_at).toLocaleDateString("id-ID"),
    Customer: o.profiles?.full_name,
    Email: o.profiles?.email,
    Phone: o.profiles?.phone,
    Address: `${o.user_addresses?.street_address}, ${o.user_addresses?.city} ${o.user_addresses?.postal_code}`,
    Total_Amount: o.total_amount,
    Status: o.status,
    Total_Items: o.order_items?.reduce((acc: number, i: any) => acc + i.quantity, 0) || 0
  }))

  // --- STATS (Based on Filtered Data) ---
  const pendingCount = orders.filter(o => ['paid', 'packed'].includes(o.status)).length
  const completedCount = orders.filter(o => o.status === 'completed').length
  const totalVolume = orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total_amount, 0)

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

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Perlu Dikirim</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-orange-600">{pendingCount}</div></CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Pesanan</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold">{orders.length}</div></CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Selesai</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold text-green-600">{completedCount}</div></CardContent>
        </Card>
        <Card>
           <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Volume (Filtered)</CardTitle></CardHeader>
           <CardContent><div className="text-2xl font-bold">Rp {(totalVolume / 1000).toLocaleString("id-ID", { maximumFractionDigits: 0 })}rb</div></CardContent>
        </Card>
      </div>

      <OrderListClient orders={orders} />
    </div>
  )
}