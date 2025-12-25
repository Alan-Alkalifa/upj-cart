import { createAdminClient } from "@/utils/supabase/admin"
import { getPlatformSettings } from "@/utils/get-settings"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, ArrowUpRight, Clock, DollarSign, Percent } from "lucide-react"
import { PayoutActionButtons } from "./payout-actions"

export default async function AdminFinancePage() {
  const supabase = createAdminClient()
  const settings = await getPlatformSettings()

  // --- PARALLEL FETCHING ---
  const [withdrawalsRes, ordersRes] = await Promise.all([
    // 1. Fetch Withdrawals
    supabase
      .from("withdrawals")
      .select(`
        *,
        organizations (
          name,
          slug
        )
      `)
      .order("created_at", { ascending: false }),

    // 2. Fetch Completed Orders (To calculate Platform Revenue)
    supabase
      .from("orders")
      .select("total_amount")
      .eq("status", "completed")
  ])

  if (withdrawalsRes.error) return <div>Error loading finance data</div>

  // --- CALCULATIONS ---
  
  // 1. Platform Revenue (Net Profit)
  const grossSales = ordersRes.data?.reduce((acc, order) => acc + order.total_amount, 0) || 0
  const feePercent = Number(settings.transaction_fee_percent) || 0
  const platformRevenue = Math.round(grossSales * (feePercent / 100))

  // 2. Withdrawals Stats
  const withdrawals = withdrawalsRes.data || []
  const pending = withdrawals.filter(w => w.status === 'requested')
  const history = withdrawals.filter(w => w.status !== 'requested')

  const totalPending = pending.reduce((acc, curr) => acc + curr.amount, 0)
  const totalPaid = history
    .filter(w => w.status === 'approved')
    .reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Finance & Payouts</h1>
        <p className="text-muted-foreground text-sm">
          Platform Fee Rate: <b>{feePercent}%</b>. Manage merchant withdrawals and monitor revenue.
        </p>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Platform Revenue (The "Cut") */}
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Net Platform Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-green-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">Rp {platformRevenue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-green-600 mt-1 flex items-center">
              <Percent className="h-3 w-3 mr-1" /> {feePercent}% fee collected
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Pending (Liabilities) */}
        <Card className={pending.length > 0 ? "border-l-4 border-l-orange-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className={`h-4 w-4 ${pending.length > 0 ? "text-orange-500" : "text-blue-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalPending.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pending.length} requests waiting approval
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Disbursed (Cash Out) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalPaid.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Transferred to merchants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending">Requests ({pending.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Withdrawal Requests</CardTitle>
              <CardDescription>
                Review bank details and mark as transferred manually.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <PayoutTable data={pending} isPending={true} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>Record of approved and rejected requests.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <PayoutTable data={history} isPending={false} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PayoutTable({ data, isPending }: { data: any[], isPending: boolean }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Wallet className="h-10 w-10 mb-2 opacity-20" />
        <p>No records found.</p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>Merchant</TableHead>
          <TableHead>Bank Details</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          {isPending && <TableHead className="text-right">Action</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((w) => (
          <TableRow key={w.id}>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(w.created_at).toLocaleDateString("id-ID")}
            </TableCell>
            <TableCell className="font-medium">
              {w.organizations?.name}
              <div className="text-xs text-muted-foreground">{w.organizations?.slug}</div>
            </TableCell>
            <TableCell>
              <div className="text-sm font-medium">{w.bank_name}</div>
              <div className="text-xs text-muted-foreground">
                {w.bank_account_number} <br/> ({w.bank_account_holder})
              </div>
            </TableCell>
            <TableCell className="font-bold">
              Rp {w.amount.toLocaleString("id-ID")}
            </TableCell>
            <TableCell>
              <Badge variant={
                w.status === 'approved' ? 'default' : 
                w.status === 'rejected' ? 'destructive' : 
                'outline'
              }>
                {w.status}
              </Badge>
              {!isPending && w.admin_note && (
                 <div className="text-[10px] text-muted-foreground mt-1 max-w-[150px]">
                    Note: {w.admin_note}
                 </div>
              )}
            </TableCell>
            {isPending && (
              <TableCell className="text-right">
                <PayoutActionButtons 
                  id={w.id} 
                  amount={w.amount}
                  merchantName={w.organizations?.name}
                  bankInfo={`${w.bank_name} - ${w.bank_account_number}`}
                />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}