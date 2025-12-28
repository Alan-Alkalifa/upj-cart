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
import { Wallet, ArrowUpRight, Clock, DollarSign, Percent, Search } from "lucide-react"
import { PayoutActionButtons } from "./payout-actions"
import { PayoutSearch } from "./payout-search" // Import Search
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination"

export default async function AdminFinancePage(props: { searchParams: Promise<{ page?: string, tab?: string, q?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  
  // Validasi Tab
  const validTabs = ["pending", "history"]
  const tabParam = searchParams.tab || "pending"
  const currentTab = (validTabs.includes(tabParam) ? tabParam : "pending") as "pending" | "history"

  const queryParam = searchParams.q || ""
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage - 1

  const supabase = createAdminClient()
  const settings = await getPlatformSettings()

  // --- QUERY BUILDER UTAMA (WITHDRAWALS) ---
  let mainQuery = supabase
      .from("withdrawals")
      .select(`
        *,
        organizations!inner (
          name,
          slug
        )
      `, { count: 'exact' })
      .order("created_at", { ascending: false })

  // 1. Filter Tab
  if (currentTab === 'pending') {
    mainQuery = mainQuery.eq('status', 'requested')
  } else {
    mainQuery = mainQuery.neq('status', 'requested')
  }

  // 2. Filter Search
  if (queryParam) {
    // Mencari di Nama Merchant (Join), Nama Pemilik Rekening, atau No. Rekening
    // Catatan: Filtering relasi membutuhkan !inner pada select (sudah ditambahkan diatas)
    mainQuery = mainQuery.or(`bank_account_holder.ilike.%${queryParam}%,bank_account_number.ilike.%${queryParam}%,organizations.name.ilike.%${queryParam}%`)
  }

  // --- PARALLEL FETCHING ---
  const [
    withdrawalsPageRes, // Data List Halaman Ini
    pendingStatRes,     // Stat: Total Pending Amount & Count
    historyStatRes,     // Stat: Total Disbursed Amount
    ordersRes           // Stat: Platform Revenue (Completed Orders)
  ] = await Promise.all([
    // 1. Data Utama
    mainQuery.range(start, end),

    // 2. Stat: Pending (Liabilities)
    supabase.from("withdrawals").select("amount").eq("status", "requested"),

    // 3. Stat: Disbursed (Approved Only)
    supabase.from("withdrawals").select("amount").eq("status", "approved"),

    // 4. Stat: Completed Orders (Untuk Revenue)
    supabase.from("orders").select("total_amount").eq("status", "completed")
  ])

  // --- PROCESSING DATA ---
  const withdrawals = withdrawalsPageRes.data || []
  const totalCount = withdrawalsPageRes.count || 0

  // 1. Platform Revenue
  const grossSales = ordersRes.data?.reduce((acc, order) => acc + order.total_amount, 0) || 0
  const feePercent = Number(settings.transaction_fee_percent) || 0
  const platformRevenue = Math.round(grossSales * (feePercent / 100))

  // 2. Withdrawal Stats
  const pendingRequests = pendingStatRes.data || []
  const totalPendingAmount = pendingRequests.reduce((acc, curr) => acc + curr.amount, 0)
  const pendingCount = pendingRequests.length

  const approvedRequests = historyStatRes.data || []
  const totalPaidAmount = approvedRequests.reduce((acc, curr) => acc + curr.amount, 0)

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(totalCount / perPage)
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

  // Helper URL Builder
  const buildLink = (page: number, tab: string) => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    params.set('page', String(page))
    if (queryParam) params.set('q', queryParam)
    return `/admin/finance?${params.toString()}`
  }

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
        {/* Card 1: Platform Revenue */}
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
        <Card className={pendingCount > 0 ? "border-l-4 border-l-orange-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payouts</CardTitle>
            <Clock className={`h-4 w-4 ${pendingCount > 0 ? "text-orange-500" : "text-blue-500"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalPendingAmount.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount} requests waiting approval
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Total Disbursed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Disbursed</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rp {totalPaidAmount.toLocaleString("id-ID")}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Transferred to merchants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- TOOLBAR: TABS & SEARCH --- */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        {/* URL-Based Tabs */}
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full md:w-auto">
          <TabLink href={buildLink(1, 'pending')} active={currentTab === 'pending'} label={`Requests (${pendingCount})`} />
          <TabLink href={buildLink(1, 'history')} active={currentTab === 'history'} label="History" />
        </div>

        {/* Search Component */}
        <PayoutSearch />
      </div>

      {/* --- MAIN CONTENT --- */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentTab === 'pending' ? "Withdrawal Requests" : "Payout History"}
          </CardTitle>
          <CardDescription>
            {currentTab === 'pending' 
              ? "Review bank details and mark as transferred manually."
              : "Record of approved and rejected requests."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          
          <PayoutTable 
            data={withdrawals} 
            isPending={currentTab === 'pending'} 
            queryParam={queryParam}
          />

          {/* Pagination Controls */}
          <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t">
             <div className="text-sm text-muted-foreground">
               Showing <b>{withdrawals.length > 0 ? start + 1 : 0}</b> - <b>{Math.min(end + 1, totalCount)}</b> of <b>{totalCount}</b> records
            </div>

            {totalPages > 1 && (
              <Pagination className="justify-center md:justify-end w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href={hasPrev ? buildLink(currentPage - 1, currentTab) : "#"} 
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
                          href={buildLink(Number(page), currentTab)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext 
                      href={hasNext ? buildLink(currentPage + 1, currentTab) : "#"}
                      className={!hasNext ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      aria-disabled={!hasNext}
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

// --- SUB COMPONENTS ---

function PayoutTable({ data, isPending, queryParam }: { data: any[], isPending: boolean, queryParam: string }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        {queryParam ? (
           <>
             <Search className="h-10 w-10 mb-2 opacity-20" />
             <p>No records found for "{queryParam}".</p>
           </>
        ) : (
           <>
             <Wallet className="h-10 w-10 mb-2 opacity-20" />
             <p>No records found.</p>
           </>
        )}
      </div>
    )
  }

  return (
    <div className="border-t">
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
                {w.organizations?.name || "Unknown"}
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
    </div>
  )
}

function TabLink({ active, href, label }: { active: boolean, href: string, label: string }) {
  return (
    <Link 
      href={href}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        active 
          ? "bg-background text-foreground shadow-sm" 
          : "hover:bg-background/50 hover:text-foreground text-muted-foreground"
      )}
    >
      {label}
    </Link>
  )
}