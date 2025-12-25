import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card" // Import Card
import { ProductActions } from "./product-actions"
import Link from "next/link"
import { Plus, Package, CheckCircle, Layers, AlertTriangle } from "lucide-react"

export default async function ProductsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: member } = await supabase.from("organization_members").select("org_id").eq("profile_id", user?.id).single()
  
  // Fetch Products with Variants & Category
  const { data: products } = await supabase
    .from("products")
    .select("*, product_variants(stock), global_categories(name)")
    .eq("org_id", member?.org_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  // --- STATS CALCULATION ---
  const totalProducts = products?.length || 0
  const activeProducts = products?.filter(p => p.is_active).length || 0
  
  // Hitung total stok dari semua varian
  const totalStock = products?.reduce((acc, p) => {
    return acc + p.product_variants.reduce((vAcc: number, v: any) => vAcc + v.stock, 0)
  }, 0) || 0

  // Hitung produk yang stoknya menipis (misal: ada varian < 5)
  const lowStockCount = products?.filter(p => {
    return p.product_variants.some((v: any) => v.stock < 5)
  }).length || 0

  return (
    <div className="space-y-6">
      
      {/* 1. Header Section */}
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Daftar Produk</h2>
           <p className="text-muted-foreground">Kelola katalog, harga, dan stok produk toko Anda.</p>
        </div>
        <Button asChild><Link href="/dashboard/products/create"><Plus className="mr-2 h-4 w-4" /> Tambah Produk</Link></Button>
      </div>

      {/* 2. Stats Cards Section (New) */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Item dalam database</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produk Aktif</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
            <p className="text-xs text-muted-foreground">Tayang di katalog</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stok Unit</CardTitle>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
            <p className="text-xs text-muted-foreground">Akumulasi semua varian</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Produk perlu restock</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Table Section */}
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Foto</TableHead>
              <TableHead>Nama Produk</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Harga</TableHead>
              <TableHead>Total Stok</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products?.length === 0 && (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">Belum ada produk.</TableCell></TableRow>
            )}
            {products?.map((p) => {
              const productTotalStock = p.product_variants.reduce((acc: number, v: any) => acc + v.stock, 0)
              // Cek apakah ada varian stok rendah
              const isLowStock = p.product_variants.some((v: any) => v.stock < 5)

              return (
                <TableRow key={p.id}>
                  <TableCell>
                    <Avatar className="h-10 w-10 rounded-md border">
                      <AvatarImage src={p.image_url} className="object-cover" />
                      <AvatarFallback>IMG</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{p.name}</div>
                    {isLowStock && (
                      <div className="flex items-center gap-1 text-[10px] text-orange-600 font-medium">
                        <AlertTriangle className="h-3 w-3" /> Stok Menipis
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{p.global_categories?.name}</TableCell>
                  <TableCell>Rp {p.base_price.toLocaleString("id-ID")}</TableCell>
                  <TableCell>
                    {productTotalStock}
                  </TableCell>
                  <TableCell>
                     <Badge variant={p.is_active ? "default" : "secondary"}>
                        {p.is_active ? 'Aktif' : 'Draft'}
                     </Badge>
                  </TableCell>
                  <TableCell>
                    <ProductActions productId={p.id} productName={p.name} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}