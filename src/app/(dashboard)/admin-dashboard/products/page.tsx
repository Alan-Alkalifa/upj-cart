import { createAdminClient } from "@/utils/supabase/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Package,
  Store,
  Trash2,
  Archive,
  AlertTriangle,
  CheckCircle,
  Search,
} from "lucide-react";
import { AdminProductActions } from "./product-actions";
import { ProductSearch } from "./product-search"; // Import Component Search
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export default async function AdminProductsPage(props: {
  searchParams: Promise<{ page?: string; tab?: string; q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams.page) || 1;

  // Validasi Tab
  const validTabs = ["active", "deleted"];
  const tabParam = searchParams.tab || "active";
  const currentTab = (validTabs.includes(tabParam) ? tabParam : "active") as
    | "active"
    | "deleted";

  const queryParam = searchParams.q || "";

  const perPage = 10;
  const start = (currentPage - 1) * perPage;
  const end = start + perPage - 1;

  const supabase = createAdminClient();

  // --- BUILD MAIN QUERY ---
  let mainQuery = supabase
    .from("products")
    .select(
      `
        *,
        organizations!inner (
          name,
          slug
        ),
        product_variants (
          stock
        )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  // 1. Filter Tab (Active vs Deleted)
  if (currentTab === "active") {
    mainQuery = mainQuery.is("deleted_at", null);
  } else {
    mainQuery = mainQuery.not("deleted_at", "is", null);
  }

  // 2. Filter Search (Cari Nama Produk)
  if (queryParam) {
    mainQuery = mainQuery.ilike("name", `%${queryParam}%`);
  }

  // --- PARALLEL FETCHING ---
  const [activeCountRes, deletedCountRes, lowStockRes, productsRes] =
    await Promise.all([
      // Stat: Total Produk Aktif
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .is("deleted_at", null),

      // Stat: Total Produk Dihapus
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .not("deleted_at", "is", null),

      // Stat: Total Stok Menipis
      supabase
        .from("product_variants")
        .select("id", { count: "exact", head: true })
        .lt("stock", 5),

      // Data Produk (Paginated)
      mainQuery.range(start, end),
    ]);

  // --- DATA PROCESSING ---
  const products = productsRes.data || [];
  const totalCount = productsRes.count || 0;

  const activeTotal = activeCountRes.count || 0;
  const deletedTotal = deletedCountRes.count || 0;
  const lowStockTotal = lowStockRes.count || 0;

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(totalCount / perPage);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;

  const getPageNumbers = () => {
    const pages = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("ellipsis");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("ellipsis");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("ellipsis");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("ellipsis");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  // Helper URL Builder
  const buildLink = (page: number, tab: string) => {
    const params = new URLSearchParams();
    params.set("tab", tab);
    params.set("page", String(page));
    if (queryParam) params.set("q", queryParam);
    return `/admin-dashboard/products?${params.toString()}`;
  };

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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Produk Aktif
            </CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tayang di etalase
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Menipis</CardTitle>
            <AlertTriangle
              className={`h-4 w-4 ${
                lowStockTotal > 0 ? "text-orange-500" : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockTotal}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Varian produk dengan stok &lt; 5
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Produk Dihapus
            </CardTitle>
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

      {/* --- TOOLBAR: TABS & SEARCH --- */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        {/* URL-Based Tabs */}
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full md:w-auto">
          <TabLink
            href={buildLink(1, "active")}
            active={currentTab === "active"}
            label={`Aktif (${activeTotal})`}
          />
          <TabLink
            href={buildLink(1, "deleted")}
            active={currentTab === "deleted"}
            label={`Sampah (${deletedTotal})`}
          />
        </div>

        {/* Search Component */}
        <ProductSearch />
      </div>

      {/* --- MAIN CONTENT --- */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentTab === "active"
              ? "Daftar Produk Tayang"
              : "Riwayat Penghapusan"}
          </CardTitle>
          <CardDescription>
            {currentTab === "active"
              ? "Menampilkan produk yang aktif dan dapat dibeli pengguna."
              : "Produk yang telah disembunyikan oleh admin."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ProductTable
            data={products}
            isDeleted={currentTab === "deleted"}
            queryParam={queryParam}
          />

          {/* Pagination Controls */}
          <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              Menampilkan <b>{products.length > 0 ? start + 1 : 0}</b> -{" "}
              <b>{Math.min(end + 1, totalCount)}</b> dari <b>{totalCount}</b>{" "}
              produk
            </div>

            {totalPages > 1 && (
              <Pagination className="justify-center md:justify-end w-auto mx-0">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href={
                        hasPrev ? buildLink(currentPage - 1, currentTab) : "#"
                      }
                      className={
                        !hasPrev
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
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
                      href={
                        hasNext ? buildLink(currentPage + 1, currentTab) : "#"
                      }
                      className={
                        !hasNext
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
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
  );
}

// --- SUB COMPONENTS ---

function ProductTable({
  data,
  isDeleted,
  queryParam,
}: {
  data: any[];
  isDeleted: boolean;
  queryParam: string;
}) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-muted/10 rounded-lg m-4 border border-dashed">
        {queryParam ? (
          <>
            <Search className="h-10 w-10 mb-2 opacity-20" />
            <p>Produk "{queryParam}" tidak ditemukan.</p>
          </>
        ) : (
          <>
            <Package className="h-10 w-10 mb-2 opacity-20" />
            <p>Tidak ada data produk.</p>
          </>
        )}
      </div>
    );
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
            <TableHead className="text-right pr-4"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((product) => {
            const totalStock =
              product.product_variants?.reduce(
                (acc: number, variant: any) => acc + (variant.stock || 0),
                0
              ) || 0;

            return (
              <TableRow
                key={product.id}
                className={isDeleted ? "bg-muted/30" : ""}
              >
                <TableCell className="pl-4">
                  <Avatar className="h-10 w-10 rounded-md border">
                    <AvatarImage
                      src={product.image_url || ""}
                      alt={product.name}
                      className="object-cover"
                    />
                    <AvatarFallback className="rounded-md bg-muted">
                      <Package className="h-5 w-5 opacity-50" />
                    </AvatarFallback>
                  </Avatar>
                </TableCell>
                <TableCell className="font-medium">
                  {product.name}
                  <div className="text-xs text-muted-foreground line-clamp-1 max-w-50">
                    {product.description}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Store className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium text-muted-foreground">
                      {product.organizations?.name || "Unknown"}
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
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function TabLink({
  active,
  href,
  label,
  icon,
}: {
  active: boolean;
  href: string;
  label: string;
  icon?: React.ReactNode;
}) {
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
      {icon}
      {label}
    </Link>
  );
}
