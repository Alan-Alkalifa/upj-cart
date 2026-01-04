import { createClient } from "@/utils/supabase/server"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductActions } from "./product-actions"
import { ProductSearch } from "./product-search"
import { CategoryManager } from "./category-manager" // Import CategoryManager
import Link from "next/link"
import { Plus, Package, CheckCircle, Layers, AlertTriangle, FileText, AlertCircle } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination"

// Tambahkan 'q' pada props searchParams
export default async function ProductsPage(props: { searchParams: Promise<{ page?: string, status?: string, q?: string }> }) {
  const searchParams = await props.searchParams
  const currentPage = Number(searchParams.page) || 1
  const statusFilter = searchParams.status || "all" 
  const queryParam = searchParams.q || "" // Ambil kata kunci pencarian
  
  const perPage = 10
  const start = (currentPage - 1) * perPage
  const end = start + perPage - 1

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id, organizations!inner(address_street, address_city)")
    .eq("profile_id", user?.id)
    .single()
  
  if (!member) return <div>Akses ditolak</div>
  
  const org = member.organizations as any
  const hasAddress = org.address_street && org.address_city

  // --- QUERY BUILDER ---
  let query = supabase
    .from("products")
    .select("*, product_variants(stock), global_categories(name)", { count: 'exact' })
    .eq("org_id", member.org_id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  // 1. Filter Status
  if (statusFilter === 'active') {
    query = query.eq('is_active', true)
  } else if (statusFilter === 'draft') {
    query = query.eq('is_active', false)
  }

  // 2. Filter Pencarian (Search)
  if (queryParam) {
    query = query.ilike('name', `%${queryParam}%`)
  }

  // Apply Pagination
  const { data: products, count: totalCount } = await query.range(start, end)

  // --- STATS & CATEGORIES QUERY ---
  const [allStatsData, categoriesData] = await Promise.all([
    supabase
      .from("products")
      .select("is_active, product_variants(stock)")
      .eq("org_id", member.org_id)
      .is("deleted_at", null),
    
    supabase
      .from("merchant_categories")
      .select("id, name")
      .eq("org_id", member.org_id)
      .is("deleted_at", null)
      .order("name")
  ])

  const allStats = allStatsData.data || []
  const categories = categoriesData.data || []
  
  const totalProducts = allStats.length
  const activeProducts = allStats.filter(p => p.is_active).length
  const draftProducts = totalProducts - activeProducts
  const totalStock = allStats.reduce((acc, p) => acc + p.product_variants.reduce((v: any, cur: any) => v + cur.stock, 0), 0)
  const lowStockCount = allStats.filter(p => p.product_variants.some((v: any) => v.stock < 5)).length

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

  const getEmptyMessage = () => {
    if (queryParam) return `Tidak ditemukan produk dengan kata kunci "${queryParam}".`
    if (statusFilter === 'active') return "Tidak ada produk dengan status Aktif."
    if (statusFilter === 'draft') return "Tidak ada produk dengan status Draft."
    return "Belum ada produk."
  }

  return (
    <div className="space-y-6">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold tracking-tight">Daftar Produk</h2>
           <p className="text-muted-foreground">Kelola katalog, harga, dan stok produk toko Anda.</p>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Category Manager Added Here */}
          <CategoryManager orgId={member.org_id} categories={categories} />
          
          {hasAddress ? (
            <Button asChild><Link href="/merchant-dashboard/products/create"><Plus className="mr-2 h-4 w-4" /> Tambah Produk</Link></Button>
          ) : (
            <Button disabled><Plus className="mr-2 h-4 w-4" /> Tambah Produk</Button>
          )}
        </div>
      </div>

      {!hasAddress && (
        <Alert variant="destructive" className="bg-orange-50 border-orange-200 text-orange-800">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Alamat Toko Belum Lengkap</AlertTitle>
          <AlertDescription className="flex items-center justify-between text-orange-800/90">
            <span>Anda belum mengatur alamat toko. Produk tidak dapat dibuat karena diperlukan untuk perhitungan ongkir.</span>
            <Button asChild size="sm" variant="outline" className="bg-white hover:bg-orange-100 border-orange-300 text-orange-800 ml-4">
              <Link href="/merchant-dashboard/settings?tab=address">Lengkapi Alamat</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 2. Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produk</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">Semua item</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
               <div><div className="text-2xl font-bold">{activeProducts}</div><p className="text-xs text-muted-foreground">Aktif</p></div>
               <div className="h-full w-px bg-border"></div>
               <div><div className="text-2xl font-bold text-muted-foreground">{draftProducts}</div><p className="text-xs text-muted-foreground">Draft</p></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stok</CardTitle>
            <Layers className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStock}</div>
            <p className="text-xs text-muted-foreground">Unit barang</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">Perlu restock</p>
          </CardContent>
        </Card>
      </div>

      {/* 3. Toolbar (Tabs + Search) */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        <Tabs defaultValue={statusFilter} className="w-full md:w-auto">
          <TabsList>
            <TabsTrigger value="all" asChild>
              <Link href={`/merchant-dashboard/products?${new URLSearchParams({ ...searchParams, status: 'all' }).toString()}`}>
                Semua ({totalProducts})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="active" asChild>
              <Link href={`/merchant-dashboard/products?${new URLSearchParams({ ...searchParams, status: 'active' }).toString()}`}>
                Aktif ({activeProducts})
              </Link>
            </TabsTrigger>
            <TabsTrigger value="draft" asChild>
              <Link href={`/merchant-dashboard/products?${new URLSearchParams({ ...searchParams, status: 'draft' }).toString()}`}>
                Draft ({draftProducts})
              </Link>
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* COMPONENT SEARCH */}
        <ProductSearch />
      </div>

      {/* 4. Table Section */}
      <div className="space-y-4">
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Foto</TableHead>
                <TableHead>Nama Produk</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Harga</TableHead>
                <TableHead>Total Stok</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12.5"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!products || products.length === 0) ? (
                <TableRow>
                   <TableCell colSpan={7} className="h-64">
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                        <FileText className="h-10 w-10 opacity-20" />
                        <p className="text-center font-medium">{getEmptyMessage()}</p>
                      </div>
                   </TableCell>
                </TableRow>
              ) : (
                products.map((p) => {
                  const productTotalStock = p.product_variants.reduce((acc: number, v: any) => acc + v.stock, 0)
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
                      <TableCell>{productTotalStock}</TableCell>
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
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* 5. Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
          <div className="text-sm text-muted-foreground">
             Menampilkan <b>{products && products.length > 0 ? start + 1 : 0}</b> - <b>{Math.min(end + 1, totalCount || 0)}</b> dari <b>{totalCount}</b> produk
          </div>

          {totalPages > 1 && (
            <Pagination className="justify-center md:justify-end w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href={hasPrev ? `/merchant-dashboard/products?page=${currentPage - 1}&status=${statusFilter}&q=${queryParam}` : "#"} 
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
                        href={`/merchant-dashboard/products?page=${page}&status=${statusFilter}&q=${queryParam}`}
                        isActive={currentPage === page}
                      >
                        {page}
                      </PaginationLink>
                    )}
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext 
                    href={hasNext ? `/merchant-dashboard/products?page=${currentPage + 1}&status=${statusFilter}&q=${queryParam}` : "#"}
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