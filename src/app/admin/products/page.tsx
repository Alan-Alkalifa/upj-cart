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
import { Package, Store, Trash2, Archive, AlertTriangle, CheckCircle } from "lucide-react"
import { AdminProductActions } from "./product-actions"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function AdminProductsPage() {
  const supabase = createAdminClient()

  // --- PARALLEL DATA FETCHING ---
  // Mengambil data tabel dan statistik secara bersamaan
  const [productsRes, activeCountRes, deletedCountRes, lowStockRes] = await Promise.all([
    // 1. Fetch Data Produk (Limit 100 untuk tabel)
    supabase
      .from("products")
      .select(`
        *,
        organizations (
          name,
          slug
        ),
        product_variants (
          stock
        )
      `)
      .order("created_at", { ascending: false })
      .limit(100),

    // 2. Stat: Total Produk Aktif (Real Count dari DB)
    supabase
      .from("products")
      .select("id", { count: 'exact', head: true })
      .is("deleted_at", null),

    // 3. Stat: Total Produk Dihapus (Real Count dari DB)
    supabase
      .from("products")
      .select("id", { count: 'exact', head: true })
      .not("deleted_at", "is", null),
    
    // 4. Stat: Total Varian Stok Menipis (< 5 unit)
    supabase
      .from("product_variants")
      .select("id", { count: 'exact', head: true })
      .lt("stock", 5)
  ])

  // --- PROCESSING DATA ---
  const products = productsRes.data || []
  const activeTotal = activeCountRes.count || 0
  const deletedTotal = deletedCountRes.count || 0
  const lowStockTotal = lowStockRes.count || 0

  // Filter untuk Tampilan Tabel (Client-side filtering dari 100 data terbaru)
  const activeProducts = products.filter(p => !p.deleted_at)
  const deletedProducts = products.filter(p => p.deleted_at)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Manajemen Produk</h1>
        <p className="text-muted-foreground text-sm">
          Monitor stok, harga, dan kepatuhan produk di seluruh merchant.
        </p>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Produk Aktif */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk Aktif</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tayang di etalase
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Stok Menipis */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${lowStockTotal > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Varian produk dengan stok &lt; 5
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Sampah */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Dihapus</CardTitle>
            <Trash2 className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deletedTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Soft deleted (Bisa dipulihkan)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* --- TABS & TABLES --- */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <CheckCircle className="h-4 w-4" />
            Aktif ({activeProducts.length})
          </TabsTrigger>
          <TabsTrigger value="deleted" className="gap-2">
            <Trash2 className="h-4 w-4" /> 
            Sampah ({deletedProducts.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB AKTIF */}
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Daftar Produk Tayang</CardTitle>
              <CardDescription>Menampilkan 100 produk terbaru yang aktif.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProductTable data={activeProducts} isDeleted={false} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB SAMPAH */}
        <TabsContent value="deleted" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                 Riwayat Penghapusan
              </CardTitle>
              <CardDescription>Produk yang telah disembunyikan oleh admin.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ProductTable data={deletedProducts} isDeleted={true} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Komponen Tabel Reusable
function ProductTable({ data, isDeleted }: { data: any[], isDeleted: boolean }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-lg">
        <Package className="h-10 w-10 mb-2 opacity-20" />
        <p>Tidak ada data produk.</p>
      </div>
    )
  }

  return (
    <div className="border-t">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 pl-4">Foto</TableHead>
            <TableHead>Nama Produk</TableHead>
            <TableHead>Toko</TableHead>
            <TableHead>Harga</TableHead>
            <TableHead>Stok</TableHead>
            <TableHead className="text-right pr-4">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((product) => {
            const totalStock = product.product_variants?.reduce(
              (acc: number, variant: any) => acc + (variant.stock || 0), 
              0
            ) || 0

            return (
              <TableRow key={product.id} className={isDeleted ? "bg-muted/30" : ""}>
                <TableCell className="pl-4">
                  <Avatar className="h-10 w-10 rounded-md border">
                    <AvatarImage src={product.image_url || ""} alt={product.name} />
                    <AvatarFallback className="rounded-md bg-muted">
                      <Package className="h-5 w-5 opacity-50" />
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  {product.name}
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                    {product.description}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">
                      {product.organizations?.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  Rp {product.base_price.toLocaleString("id-ID")}
                </TableCell>
                <TableCell>
                  <Badge variant={totalStock > 0 ? "outline" : "secondary"}>
                    {totalStock} Unit
                  </Badge>
                </TableCell>
                <TableCell className="text-right pr-4">
                  <AdminProductActions 
                    productId={product.id} 
                    productName={product.name}
                    isDeleted={isDeleted} 
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