import { createClient } from "@/utils/supabase/server"
import { CreateCouponDialog } from "./coupon-client"
import { CouponActions } from "./coupon-actions" // Import komponen aksi baris
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TicketPercent, CheckCircle, Repeat, Clock, Tag } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination"

export default async function CouponsPage(props: { searchParams: Promise<{ page?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: member } = await supabase.from("organization_members").select("org_id").eq("profile_id", user.id).single()
  
  if (!member) redirect("/")

  // --- PARALLEL DATA FETCHING ---
  const [paginatedRes, statsRes] = await Promise.all([
    // 1. Fetch Coupons (Paginated)
    supabase
      .from("coupons")
      .select("*", { count: 'exact' })
      .eq("org_id", member.org_id)
      .order("created_at", { ascending: false })
      .range(start, end),
    
    // 2. Fetch All Coupons (For Stats)
    supabase
      .from("coupons")
      .select("is_active, expires_at, times_used")
      .eq("org_id", member.org_id)
  ])

  const coupons = paginatedRes.data || []
  const totalCount = paginatedRes.count || 0
  const allCoupons = statsRes.data || []

  // --- STATS CALCULATION ---
  const totalCoupons = totalCount
  const activeCount = allCoupons.filter(c => {
    const isNotExpired = new Date(c.expires_at) > new Date()
    return c.is_active && isNotExpired
  }).length
  const totalUsage = allCoupons.reduce((acc, c) => acc + c.times_used, 0)
  const expiredCount = allCoupons.filter(c => new Date(c.expires_at) < new Date()).length

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

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kupon Diskon</h2>
          <p className="text-muted-foreground">Buat dan kelola kode promo untuk menarik pelanggan.</p>
        </div>
        <CreateCouponDialog orgId={member.org_id} />
      </div>

      {/* 2. Stats Cards Section */}
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

      {/* 3. Table Section */}
      <div className="space-y-4">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Diskon</TableHead>
                <TableHead>Pemakaian</TableHead>
                <TableHead>Berlaku Hingga</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-48">
                     <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <Tag className="h-10 w-10 opacity-20" />
                        <p className="text-center font-medium">Belum ada kupon.</p>
                     </div>
                  </TableCell>
                </TableRow>
              ) : (
                coupons.map((c) => {
                   const isExpired = new Date(c.expires_at) < new Date()
                   return (
                    <TableRow key={c.id} className={isExpired ? "bg-muted/50" : ""}>
                      <TableCell>
                        <span className="font-mono font-bold text-primary tracking-wide bg-primary/10 px-2 py-1 rounded">
                           {c.code}
                        </span>
                        {isExpired && <span className="ml-2 text-[10px] text-red-500 font-medium">(Expired)</span>}
                      </TableCell>
                      <TableCell className="font-medium">{c.discount_percent}%</TableCell>
                      <TableCell>
                        {c.times_used} <span className="text-muted-foreground">/ {c.max_uses === -1 ? "∞" : c.max_uses}</span>
                      </TableCell>
                      <TableCell>
                        {new Date(c.expires_at).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-right">
                        <CouponActions id={c.id} code={c.code} isActive={c.is_active} />
                      </TableCell>
                    </TableRow>
                   )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 4. Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
             Menampilkan <b>{coupons.length > 0 ? start + 1 : 0}</b> - <b>{Math.min(end + 1, totalCount)}</b> dari <b>{totalCount}</b> kupon
          </div>

          {totalPages > 1 && (
            <Pagination className="justify-center md:justify-end w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href={hasPrev ? `/merchant/coupons?page=${currentPage - 1}` : "#"} 
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
                        href={`/merchant/coupons?page=${page}`}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    href={hasNext ? `/merchant/coupons?page=${currentPage + 1}` : "#"}
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