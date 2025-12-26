import { createAdminClient } from "@/utils/supabase/admin"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Store, User, Mail, Calendar, Clock, CheckCircle, XCircle } from "lucide-react"
import { MerchantActionButtons } from "./merchant-actions"

export default async function MerchantsPage() {
  const supabase = createAdminClient()

  // Fetch semua data merchant
  const { data: merchants, error } = await supabase
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
    `)
    .eq("organization_members.role", "owner")
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching merchants:", error)
    return <div className="text-destructive p-4">Gagal memuat data merchant.</div>
  }

  // Filter lists (Hitung di sisi server)
  const pendingMerchants = merchants?.filter(m => m.status === 'pending') || []
  const activeMerchants = merchants?.filter(m => m.status === 'active') || []
  const rejectedMerchants = merchants?.filter(m => m.status === 'rejected') || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Merchant</h1>
        <p className="text-muted-foreground">Setujui atau tolak pengajuan toko baru.</p>
      </div>

      {/* --- BAGIAN BARU: KARTU INFORMASI --- */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Menunggu Persetujuan */}
        <Card className={pendingMerchants.length > 0 ? "border-l-4 border-l-orange-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Menunggu Verifikasi</CardTitle>
            <Clock className={`h-4 w-4 ${pendingMerchants.length > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingMerchants.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingMerchants.length > 0 
                ? "Toko perlu tindakan segera" 
                : "Tidak ada antrian"}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Toko Aktif */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toko Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMerchants.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Berjalan normal
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Toko Ditolak */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ditolak / Suspend</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedMerchants.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tidak diizinkan beroperasi
            </p>
          </CardContent>
        </Card>
      </div>
      {/* --- END KARTU INFORMASI --- */}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="pending">Menunggu ({pendingMerchants.length})</TabsTrigger>
          <TabsTrigger value="active">Aktif ({activeMerchants.length})</TabsTrigger>
          <TabsTrigger value="rejected">Ditolak ({rejectedMerchants.length})</TabsTrigger>
        </TabsList>

        {/* PENDING TAB */}
        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Antrian Persetujuan</CardTitle>
              <CardDescription>Daftar toko yang menunggu verifikasi admin.</CardDescription>
            </CardHeader>
            <CardContent>
              <MerchantTable data={pendingMerchants} showActions />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ACTIVE TAB */}
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Toko Aktif</CardTitle>
              <CardDescription>Merchant yang sedang beroperasi di platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <MerchantTable data={activeMerchants} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* REJECTED TAB */}
        <TabsContent value="rejected" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Riwayat Penolakan</CardTitle>
            </CardHeader>
            <CardContent>
              <MerchantTable data={rejectedMerchants} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function MerchantTable({ data, showActions = false }: { data: any[], showActions?: boolean }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
        <Store className="h-10 w-10 mb-2 opacity-20" />
        <p>Tidak ada data.</p>
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