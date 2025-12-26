import { createClient } from "@/utils/supabase/server"
import { getPlatformSettings } from "@/utils/get-settings" // Import Settings
import { WithdrawalDialog } from "./withdrawal-dialog"
import { DateRangeFilter } from "@/components/dashboard/date-range-filter"
import { ExportButton } from "@/components/dashboard/export-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowUpRight, DollarSign, History, Info } from "lucide-react"
import { redirect } from "next/navigation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export default async function FinancePage(props: { searchParams: Promise<{ from?: string, to?: string }> }) {
  const searchParams = await props.searchParams
  const supabase = await createClient()
  
  // 1. Get Platform Settings (Fee Percentage)
  const settings = await getPlatformSettings()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations(*)")
    .eq("profile_id", user.id)
    .single()

  const rawOrg = member?.organizations
  
  if (!member || !rawOrg) {
    return (
      <div className="p-4 text-red-500">
        Data Organisasi tidak ditemukan. Hubungi support.
      </div>
    )
  }

  const org: any = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg

  // --- 2. REVENUE CALCULATION ---
  const { data: revenueData } = await supabase
    .from("order_items")
    .select("price_at_purchase, quantity, product_variants!inner(products!inner(org_id)), orders!inner(status)")
    .eq("product_variants.products.org_id", org.id)
    .eq("orders.status", "completed")
  
  // Gross Revenue (Total Sales)
  const totalGrossRevenue = revenueData?.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0) || 0

  // Calculate Fee & Net Revenue
  const feePercent = Number(settings.transaction_fee_percent) || 0
  const platformFee = Math.round(totalGrossRevenue * (feePercent / 100))
  const totalNetRevenue = totalGrossRevenue - platformFee

  // --- 3. WITHDRAWALS QUERY (Filtered) ---
  let withdrawalQuery = supabase
    .from("withdrawals")
    .select("*")
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })

  if (searchParams.from) withdrawalQuery = withdrawalQuery.gte("created_at", searchParams.from)
  if (searchParams.to) {
     const toDate = new Date(searchParams.to)
     toDate.setHours(23, 59, 59)
     withdrawalQuery = withdrawalQuery.lte("created_at", toDate.toISOString())
  }

  const { data: withdrawals } = await withdrawalQuery
  const safeWithdrawals = withdrawals || []

  // --- 4. BALANCE CALCULATION ---
  const { data: allWithdrawals } = await supabase
    .from("withdrawals")
    .select("amount, status")
    .eq("org_id", org.id)
  
  // Total Withdrawn (Approved or Pending)
  const totalWithdrawnAllTime = allWithdrawals?.reduce((acc, w) => (w.status === 'approved' || w.status === 'requested') ? acc + w.amount : acc, 0) || 0
  
  // Available Balance = Net Revenue - Total Withdrawn
  const availableBalance = totalNetRevenue - totalWithdrawnAllTime

  // --- EXPORT DATA ---
  const exportData = safeWithdrawals.map(w => ({
    ID: w.id,
    Date: new Date(w.created_at).toLocaleDateString("id-ID"),
    Amount: w.amount,
    Bank: w.bank_name,
    Account: w.bank_account_number, // Adjusted to standard schema
    Holder: w.bank_account_holder,
    Status: w.status,
    Admin_Note: w.admin_note || ""
  }))

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Keuangan</h2>
          <p className="text-muted-foreground">
            Biaya Admin Platform saat ini: <b>{feePercent}%</b>
          </p>
        </div>
        <div className="flex items-center gap-2">
           <DateRangeFilter />
           <ExportButton data={exportData} filename="laporan_keuangan" />
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* CARD 1: NET REVENUE */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
               Pendapatan Bersih
               <TooltipProvider>
                 <Tooltip>
                   <TooltipTrigger><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                   <TooltipContent>
                     Total penjualan dikurangi biaya admin ({feePercent}%)
                   </TooltipContent>
                 </Tooltip>
               </TooltipProvider>
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Rp {totalNetRevenue.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Gross: Rp {totalGrossRevenue.toLocaleString("id-ID")} (Fee: -Rp {platformFee.toLocaleString("id-ID")})
            </p>
          </CardContent>
        </Card>

        {/* CARD 2: WITHDRAWN */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Ditarik / Pending</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
             <div className="text-2xl font-bold text-muted-foreground">Rp {totalWithdrawnAllTime.toLocaleString("id-ID")}</div>
          </CardContent>
        </Card>

        {/* CARD 3: AVAILABLE BALANCE */}
        <Card className="border-indigo-200 bg-indigo-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700">Saldo Tersedia</CardTitle>
            <WalletIcon className="h-4 w-4 text-indigo-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">Rp {availableBalance.toLocaleString("id-ID")}</div>
            <div className="mt-3">
                <WithdrawalDialog org={org} maxBalance={availableBalance} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2"><History className="h-4 w-4" /> Riwayat Penarikan</h3>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Catatan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {safeWithdrawals.length === 0 && (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">Data tidak ditemukan pada rentang tanggal ini.</TableCell></TableRow>
              )}
              {safeWithdrawals.map((w) => (
                <TableRow key={w.id}>
                  <TableCell>{new Date(w.created_at).toLocaleDateString("id-ID")}</TableCell>
                  <TableCell className="font-medium">Rp {w.amount.toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                      <div className="text-xs">
                        <div>{w.bank_name} - {w.bank_account_number}</div>
                        <div className="text-muted-foreground">{w.bank_account_holder}</div>
                      </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={w.status === 'approved' ? 'default' : w.status === 'requested' ? 'outline' : 'destructive'} className="capitalize">
                      {w.status === 'requested' ? 'Diproses' : w.status === 'approved' ? 'Berhasil' : 'Ditolak'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{w.admin_note || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}

function WalletIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></svg>
  )
}