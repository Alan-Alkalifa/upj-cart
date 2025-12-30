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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Store, Clock, CheckCircle, XCircle, AlertTriangle, ShieldCheck, ShieldAlert } from "lucide-react"
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
} from "@/components/ui/pagination"

export default async function MerchantsPage(props: { 
  searchParams: Promise<{ page?: string, tab?: string, q?: string }> 
}) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  
  const validStatuses = ["pending", "active", "suspended", "rejected"]
  const tabParam = searchParams.tab || "pending"
  const currentTab = (validStatuses.includes(tabParam) ? tabParam : "pending") as 
    | "pending" 
    | "active" 
    | "suspended" 
    | "rejected"

  const queryParam = searchParams.q || ""
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage - 1

  const supabase = createAdminClient()

  // 1. Ambil data merchant dan profile pemilik
  let mainQuery = supabase
      .from("organizations")
      .select(`
        *,
        organization_members!inner (
          role,
          profiles (
            id,
            email,
            full_name
          )
        )
      `, { count: 'exact' })
      .eq("organization_members.role", "owner")
      .eq("status", currentTab)
      .order("created_at", { ascending: false })

  if (queryParam) {
    mainQuery = mainQuery.or(`name.ilike.%${queryParam}%,slug.ilike.%${queryParam}%`)
  }

  // 2. Fetch data parallel termasuk Auth Admin API untuk email_verified
  const [
    pendingCountRes,
    activeCountRes,
    suspendedCountRes,
    rejectedCountRes,
    merchantsRes,
    { data: { users: authUsers } }
  ] = await Promise.all([
    supabase.from("organizations").select("id", { count: 'exact', head: true }).eq("status", "pending"),
    supabase.from("organizations").select("id", { count: 'exact', head: true }).eq("status", "active"),
    supabase.from("organizations").select("id", { count: 'exact', head: true }).eq("status", "suspended"),
    supabase.from("organizations").select("id", { count: 'exact', head: true }).eq("status", "rejected"),
    mainQuery.range(start, end),
    supabase.auth.admin.listUsers() 
  ])

  const counts = {
    pending: pendingCountRes.count || 0,
    active: activeCountRes.count || 0,
    suspended: suspendedCountRes.count || 0,
    rejected: rejectedCountRes.count || 0
  }
  
  // Mapping data untuk menyertakan email_verified
  const merchants = (merchantsRes.data || []).map(m => {
    const ownerProfile = m.organization_members?.[0]?.profiles
    const authUser = authUsers.find(u => u.id === ownerProfile?.id)
    return {
      ...m,
      email_verified: !!authUser?.email_confirmed_at
    }
  })

  const totalCount = merchantsRes.count || 0
  const totalPages = Math.ceil(totalCount / perPage)

  const buildLink = (page: number, tab: string) => {
    const params = new URLSearchParams()
    params.set('tab', tab)
    params.set('page', String(page))
    if (queryParam) params.set('q', queryParam)
    return `/admin/merchants?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Merchant</h1>
        <p className="text-muted-foreground">Otorisasi dan pantau status toko civitas akademika.</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard title="Menunggu" count={counts.pending} icon={<Clock className="text-orange-500" />} />
        <SummaryCard title="Aktif" count={counts.active} icon={<CheckCircle className="text-green-600" />} />
        <SummaryCard title="Suspend" count={counts.suspended} icon={<AlertTriangle className="text-amber-500" />} />
        <SummaryCard title="Ditolak" count={counts.rejected} icon={<XCircle className="text-destructive" />} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full md:w-auto">
          <TabLink href={buildLink(1, 'pending')} active={currentTab === 'pending'} label={`Menunggu (${counts.pending})`} />
          <TabLink href={buildLink(1, 'active')} active={currentTab === 'active'} label={`Aktif (${counts.active})`} />
          <TabLink href={buildLink(1, 'suspended')} active={currentTab === 'suspended'} label={`Suspend (${counts.suspended})`} />
          <TabLink href={buildLink(1, 'rejected')} active={currentTab === 'rejected'} label={`Ditolak (${counts.rejected})`} />
        </div>
        <MerchantSearch />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="capitalize">Kategori: {currentTab}</CardTitle>
        </CardHeader>
        <CardContent>
          <MerchantTable data={merchants} queryParam={queryParam} />
          
          <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
               Total {totalCount} merchant
            </div>

            {totalPages > 1 && (
              <Pagination className="justify-end w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href={currentPage > 1 ? buildLink(currentPage - 1, currentTab) : "#"} 
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : ""}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationLink href="#" isActive>{currentPage}</PaginationLink>
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext 
                      href={currentPage < totalPages ? buildLink(currentPage + 1, currentTab) : "#"}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : ""}
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

function MerchantTable({ data, queryParam }: { data: any[], queryParam: string }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed rounded-lg">
        <p>{queryParam ? `Tidak ada hasil untuk "${queryParam}"` : "Daftar kosong."}</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Logo</TableHead>
            <TableHead>Nama Toko</TableHead>
            <TableHead>Pemilik</TableHead>
            <TableHead>Verif Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((m) => {
            const owner = m.organization_members?.[0]?.profiles
            return (
              <TableRow key={m.id}>
                <TableCell>
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={m.logo_url} alt={m.name} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Store className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell>
                  <div className="font-semibold">{m.name}</div>
                  <div className="text-xs text-muted-foreground">@{m.slug}</div>
                </TableCell>
                <TableCell>
                  <div className="text-sm font-medium">{owner?.full_name}</div>
                  <div className="text-xs text-muted-foreground">{owner?.email}</div>
                </TableCell>
                <TableCell>
                  {m.email_verified ? (
                    <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 gap-1">
                      <ShieldCheck className="h-3 w-3" /> Verified
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground gap-1">
                      <ShieldAlert className="h-3 w-3" /> Unverified
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className="capitalize" variant={m.status === 'active' ? 'default' : m.status === 'suspended' ? 'outline' : 'destructive'}>
                    {m.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <MerchantActionButtons 
                    orgId={m.id} 
                    email={owner?.email} 
                    orgName={m.name} 
                    status={m.status}
                  />
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function SummaryCard({ title, count, icon }: { title: string, count: number, icon: React.ReactNode }) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className="h-4 w-4">{icon}</div>
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{count}</div></CardContent>
    </Card>
  )
}

function TabLink({ active, href, label }: { active: boolean, href: string, label: string }) {
  return (
    <Link href={href} className={cn(
      "inline-flex items-center justify-center rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
      active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
    )}>{label}</Link>
  )
}