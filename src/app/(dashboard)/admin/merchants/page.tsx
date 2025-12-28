import { createAdminClient } from "@/utils/supabase/admin"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Store, User, Mail, Calendar, Clock, CheckCircle, XCircle, Search } from "lucide-react"
import { MerchantActionButtons } from "./merchant-actions"
import { MerchantSearch } from "./merchant-search"
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

export default async function MerchantsPage(props: { searchParams: Promise<{ page?: string, tab?: string, q?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  
  // FIX: Validasi dan Casting tipe data status
  const validStatuses = ["pending", "active", "rejected"]
  const tabParam = searchParams.tab || "pending"
  const currentTab = (validStatuses.includes(tabParam) ? tabParam : "pending") as "pending" | "active" | "rejected"

  const queryParam = searchParams.q || ""
  
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage - 1

  const supabase = createAdminClient()

  // --- QUERY BUILDER UTAMA ---
  let mainQuery = supabase
      .from("organizations")
      .select(`
        *,
        organization_members!inner (
          role,
          profiles (
            email,
            full_name
          )
        )
      `, { count: 'exact' })
      .eq("organization_members.role", "owner")
      .eq("status", currentTab) // TypeScript sekarang tidak akan error di sini
      .order("created_at", { ascending: false })

  // Terapkan filter pencarian jika ada
  if (queryParam) {
    mainQuery = mainQuery.or(`name.ilike.%${queryParam}%,slug.ilike.%${queryParam}%`)
  }

  // --- PARALLEL FETCHING ---
  const [
    pendingCountRes,
    activeCountRes,
    rejectedCountRes,
    merchantsRes
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: 'exact', head: true }).eq("status", "pending"),
    supabase.from("organizations").select("id", { count: 'exact', head: true }).eq("status", "active"),
    supabase.from("organizations").select("id", { count: 'exact', head: true }).eq("status", "rejected"),
    
    // Fetch Data dengan Pagination & Search
    mainQuery.range(start, end)
  ])

  const pendingCount = pendingCountRes.count || 0
  const activeCount = activeCountRes.count || 0
  const rejectedCount = rejectedCountRes.count || 0
  
  const merchants = merchantsRes.data || []
  const totalCount = merchantsRes.count || 0

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
    return `/admin/merchants?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Merchant</h1>
        <p className="text-muted-foreground">Setujui atau tolak pengajuan toko baru.</p>
      </div>

      {/* --- INFO CARDS --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={pendingCount > 0 ? "border-l-4 border-l-orange-500 shadow-sm" : "shadow-sm"}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Verifikasi</CardTitle>
            <Clock className={`h-4 w-4 ${pendingCount > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingCount > 0 ? "Toko perlu tindakan segera" : "Tidak ada antrian"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toko Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Berjalan normal</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak / Suspend</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Tidak diizinkan beroperasi</p>
          </CardContent>
        </Card>
      </div>

      {/* --- TOOLBAR: TAB & SEARCH --- */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        {/* Tab Navigation */}
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full md:w-auto">
          <TabLink href={buildLink(1, 'pending')} active={currentTab === 'pending'} label={`Menunggu (${pendingCount})`} />
          <TabLink href={buildLink(1, 'active')} active={currentTab === 'active'} label={`Aktif (${activeCount})`} />
          <TabLink href={buildLink(1, 'rejected')} active={currentTab === 'rejected'} label={`Ditolak (${rejectedCount})`} />
        </div>

        {/* Search Component */}
        <MerchantSearch />
      </div>

      {/* --- MAIN CONTENT --- */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentTab === 'pending' && "Antrian Persetujuan"}
            {currentTab === 'active' && "Toko Aktif"}
            {currentTab === 'rejected' && "Riwayat Penolakan"}
          </CardTitle>
          <CardDescription>
            {currentTab === 'pending' && "Daftar toko yang menunggu verifikasi admin."}
            {currentTab === 'active' && "Merchant yang sedang beroperasi di platform."}
            {currentTab === 'rejected' && "Daftar toko yang telah ditolak atau disuspend."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          
          <MerchantTable 
            data={merchants} 
            showActions={currentTab === 'pending'} 
            queryParam={queryParam}
          />

          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
               Menampilkan <b>{merchants.length > 0 ? start + 1 : 0}</b> - <b>{Math.min(end + 1, totalCount)}</b> dari <b>{totalCount}</b> data
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

function MerchantTable({ data, showActions = false, queryParam }: { data: any[], showActions?: boolean, queryParam?: string }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
        {queryParam ? (
           <>
             <Search className="h-10 w-10 mb-2 opacity-20" />
             <p>Toko "{queryParam}" tidak ditemukan.</p>
           </>
        ) : (
           <>
             <Store className="h-10 w-10 mb-2 opacity-20" />
             <p>Tidak ada data.</p>
           </>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama Toko</TableHead>
            <TableHead>Pemilik</TableHead>
            <TableHead>Kontak</TableHead>
            <TableHead>Tanggal Daftar</TableHead>
            <TableHead>Status</TableHead>
            {showActions && <TableHead className="text-right">Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((m) => {
            const owner = m.organization_members?.[0]?.profiles
            return (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{m.name}</div>
                      <div className="text-xs text-muted-foreground">{m.slug}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{owner?.full_name || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span className="text-sm">{owner?.email || "-"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="text-sm">{new Date(m.created_at).toLocaleDateString("id-ID", {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={
                      m.status === 'active' ? 'default' : 
                      m.status === 'rejected' ? 'destructive' : 
                      'secondary'
                    } 
                    className="capitalize"
                  >
                    {m.status === 'pending' ? 'Menunggu' : m.status}
                  </Badge>
                </TableCell>
                {showActions && (
                  <TableCell className="text-right">
                    <MerchantActionButtons 
                      orgId={m.id} 
                      email={owner?.email} 
                      orgName={m.name} 
                    />
                  </TableCell>
                )}
              </TableRow>
            )
          })}
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