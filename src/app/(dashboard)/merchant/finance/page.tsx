import { createClient } from "@/utils/supabase/server"
import { getPlatformSettings } from "@/utils/get-settings"
import { WithdrawalDialog } from "./withdrawal-dialog"
import { DateRangeFilter } from "@/components/dashboard/date-range-filter"
import { ExportButton } from "@/components/dashboard/export-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert" // Import Alert
import { ArrowUpRight, DollarSign, History, Info, AlertCircle, CreditCard, Banknote } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination"

export default async function FinancePage(props: { searchParams: Promise<{ page?: string, from?: string, to?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage - 1

  const supabase = await createClient()
  
  // 1. Get Platform Settings
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
    return <div className="p-4 text-red-500">Data Organisasi tidak ditemukan.</div>
  }

  const org: any = Array.isArray(rawOrg) ? rawOrg[0] : rawOrg

  // --- CEK KELENGKAPAN DATA BANK ---
  const hasBankInfo = org.bank_name && org.bank_account_number && org.bank_account_holder

  // --- 2. REVENUE CALCULATION ---
  const { data: revenueData } = await supabase
    .from("order_items")
    .select("price_at_purchase, quantity, product_variants!inner(products!inner(org_id)), orders!inner(status)")
    .eq("product_variants.products.org_id", org.id)
    .eq("orders.status", "completed")
  
  const totalGrossRevenue = revenueData?.reduce((acc, item) => acc + (item.price_at_purchase * item.quantity), 0) || 0
  const feePercent = Number(settings.transaction_fee_percent) || 0
  const platformFee = Math.round(totalGrossRevenue * (feePercent / 100))
  const totalNetRevenue = totalGrossRevenue - platformFee

  // --- 3. WITHDRAWALS QUERY (Paginated) ---
  let withdrawalQuery = supabase
    .from("withdrawals")
    .select("*", { count: 'exact' }) // Fetch count for pagination
    .eq("org_id", org.id)
    .order("created_at", { ascending: false })

  if (searchParams.from) withdrawalQuery = withdrawalQuery.gte("created_at", searchParams.from)
  if (searchParams.to) {
     const toDate = new Date(searchParams.to)
     toDate.setHours(23, 59, 59)
     withdrawalQuery = withdrawalQuery.lte("created_at", toDate.toISOString())
  }

  const { data: withdrawals, count: totalCount } = await withdrawalQuery.range(start, end)
  const safeWithdrawals = withdrawals || []

  // --- 4. BALANCE CALCULATION ---
  // Ambil semua withdrawal (approved/requested) untuk hitung saldo, bukan cuma page ini
  const { data: allWithdrawals } = await supabase
    .from("withdrawals")
    .select("amount, status")
    .eq("org_id", org.id)
  
  const totalWithdrawnAllTime = allWithdrawals?.reduce((acc, w) => (w.status === 'approved' || w.status === 'requested') ? acc + w.amount : acc, 0) || 0
  const availableBalance = totalNetRevenue - totalWithdrawnAllTime

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil((totalCount || 0) / perPage)
  const hasNext = currentPage < totalPages
  const hasPrev = currentPage > 1

  const getPageNumbers = () => {
    const pages = []
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i)
        pages.push("ellipsis")
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1)
        pages.push("ellipsis")
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
      } else {
        pages.push(1)
        pages.push("ellipsis")
        pages.push(currentPage - 1)
        pages.push(currentPage)
        pages.push(currentPage + 1)
        pages.push("ellipsis")
        pages.push(totalPages)
      }
    }
    return pages
  }

  // Helper URL builder
  const buildLink = (page: number) => {
    const params = new URLSearchParams()
    if (searchParams.from) params.set('from', searchParams.from)
    if (searchParams.to) params.set('to', searchParams.to)
    params.set('page', String(page))
    return `/merchant/finance?${params.toString()}`
  }

  const exportData = safeWithdrawals.map(w => ({
    ID: w.id,
    Date: new Date(w.created_at).toLocaleDateString("id-ID"),
    Amount: w.amount,
    Bank: w.bank_name,
    Account: w.bank_account_number,
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
            Kelola pendapatan, penarikan dana, dan rekening bank.
          </p>
        </div>
        <div className="flex items-center gap-2">
           <DateRangeFilter />
           <ExportButton data={exportData} filename="laporan_keuangan" />
        </div>
      </div>

      {/* ALERT JIKA REKENING BELUM DIISI */}
      {!hasBankInfo && (
        <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Rekening Bank Belum Diatur</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>Anda belum melengkapi informasi rekening bank. Anda tidak dapat melakukan penarikan dana sebelum mengaturnya.</span>
            <Button asChild size="sm" variant="outline" className="bg-white hover:bg-red-100 border-red-300 text-red-800 ml-4">
              <Link href="/merchant/settings?tab=general">Atur Sekarang</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

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
              Gross: Rp {totalGrossRevenue.toLocaleString("id-ID")}
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
             <p className="text-xs text-muted-foreground mt-1">
               Dana yang sudah atau sedang dicairkan.
             </p>
          </CardContent>
        </Card>

        {/* CARD 3: AVAILABLE BALANCE */}
        <Card className="border-indigo-200 bg-indigo-50/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-indigo-700">Saldo Tersedia</CardTitle>
            <Banknote className="h-4 w-4 text-indigo-700" />
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

      {/* TABLE SECTION */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium flex items-center gap-2"><History className="h-4 w-4" /> Riwayat Penarikan</h3>
        
        <div className="rounded-md border bg-card">
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
              {safeWithdrawals.length === 0 ? (
                <TableRow>
                   <TableCell colSpan={5} className="h-32">
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <CreditCard className="h-8 w-8 opacity-20" />
                        <p className="text-center font-medium">Belum ada riwayat penarikan.</p>
                      </div>
                   </TableCell>
                </TableRow>
              ) : (
                safeWithdrawals.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>{new Date(w.created_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}</TableCell>
                    <TableCell className="font-medium">Rp {w.amount.toLocaleString("id-ID")}</TableCell>
                    <TableCell>
                        <div className="text-xs space-y-0.5">
                          <div className="font-medium">{w.bank_name}</div>
                          <div>{w.bank_account_number}</div>
                          <div className="text-muted-foreground text-[10px]">a.n {w.bank_account_holder}</div>
                        </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={w.status === 'approved' ? 'default' : w.status === 'requested' ? 'outline' : 'destructive'} className="capitalize">
                        {w.status === 'requested' ? 'Diproses' : w.status === 'approved' ? 'Berhasil' : 'Ditolak'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{w.admin_note || "-"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* PAGINATION CONTROLS */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
             Menampilkan <b>{safeWithdrawals.length > 0 ? start + 1 : 0}</b> - <b>{Math.min(end + 1, totalCount || 0)}</b> dari <b>{totalCount}</b> transaksi
          </div>

          {totalPages > 1 && (
            <Pagination className="justify-center md:justify-end w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href={hasPrev ? buildLink(currentPage - 1) : "#"} 
                    className={!hasPrev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={!hasPrev}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, i) => (
                  <PaginationItem key={i}>
                    {page === "ellipsis" ? (
                      <PaginationEllipsis />
                    ) : (
                      <PaginationLink 
                        href={buildLink(Number(page))}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    href={hasNext ? buildLink(currentPage + 1) : "#"}
                    className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    aria-disabled={!hasNext}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </div>
  )
}