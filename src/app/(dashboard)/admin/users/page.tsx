import { createAdminClient } from "@/utils/supabase/admin"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, User, Store, ShieldCheck, UserPlus } from "lucide-react"

export default async function AdminUsersPage() {
  const supabase = createAdminClient()

  // 1. Fetch Semua Profile (Bypass RLS)
  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) {
    return <div className="p-4 text-destructive">Gagal memuat data pengguna.</div>
  }

  // 2. Hitung Statistik (Client-side calculation agar hemat request)
  const totalUsers = users.length
  const merchantsCount = users.filter(u => u.role === 'merchant').length
  const buyersCount = users.filter(u => u.role === 'buyer').length
  const adminsCount = users.filter(u => u.role === 'super_admin').length
  
  // Hitung user baru bulan ini
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const newUsersCount = users.filter(u => new Date(u.created_at || "") >= startOfMonth).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h1>
        <p className="text-muted-foreground text-sm">
          Daftar seluruh akun yang terdaftar di platform UPJ Cart.
        </p>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pengguna</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Akun terdaftar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pembeli (Buyers)</CardTitle>
            <User className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{buyersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Customer potensial
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Merchant</CardTitle>
            <Store className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{merchantsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pemilik toko
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Baru</CardTitle>
            <UserPlus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newUsersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Bulan ini
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- USER LIST TABS --- */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">Semua</TabsTrigger>
          <TabsTrigger value="buyer">Buyers</TabsTrigger>
          <TabsTrigger value="merchant">Merchants</TabsTrigger>
          <TabsTrigger value="admin">Admins</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <UserTable data={users} />
        </TabsContent>
        <TabsContent value="buyer" className="mt-4">
          <UserTable data={users.filter(u => u.role === 'buyer')} />
        </TabsContent>
        <TabsContent value="merchant" className="mt-4">
          <UserTable data={users.filter(u => u.role === 'merchant')} />
        </TabsContent>
        <TabsContent value="admin" className="mt-4">
          <UserTable data={users.filter(u => u.role === 'super_admin')} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function UserTable({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-10 text-muted-foreground">
          <Users className="h-10 w-10 mb-2 opacity-20" />
          <p>Tidak ada data pengguna.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px] pl-4">Avatar</TableHead>
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Bergabung Sejak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((user) => (
              <TableRow key={user.id}>
                <TableCell className="pl-4">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {user.full_name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  {user.full_name || "Tanpa Nama"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    user.role === 'super_admin' ? 'default' : 
                    user.role === 'merchant' ? 'secondary' : 'outline'
                  }>
                    {user.role === 'super_admin' && <ShieldCheck className="w-3 h-3 mr-1" />}
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {user.created_at ? new Date(user.created_at).toLocaleDateString("id-ID", {
                    day: "numeric", month: "long", year: "numeric"
                  }) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}