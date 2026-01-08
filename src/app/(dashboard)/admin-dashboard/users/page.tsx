import { createAdminClient } from "@/utils/supabase/admin";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Users,
  User,
  Store,
  ShieldCheck,
  UserPlus,
  Search,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { UserSearch } from "./user-search"; // Import Search Component
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

export default async function AdminUsersPage(props: {
  searchParams: Promise<{ page?: string; tab?: string; q?: string }>;
}) {
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams.page) || 1;

  // Validasi Tab
  const validTabs = ["all", "buyer", "merchant", "admin"];
  const tabParam = searchParams.tab || "all";
  const currentTab = validTabs.includes(tabParam) ? tabParam : "all";

  const queryParam = searchParams.q || "";
  const perPage = 10;
  const start = (currentPage - 1) * perPage;
  const end = start + perPage - 1;

  const supabase = createAdminClient();

  // --- QUERY BUILDER UTAMA ---
  let mainQuery = supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  // 1. Filter Role (Tab)
  if (currentTab === "buyer") {
    mainQuery = mainQuery.eq("role", "buyer");
  } else if (currentTab === "merchant") {
    mainQuery = mainQuery.eq("role", "merchant");
  } else if (currentTab === "admin") {
    mainQuery = mainQuery.eq("role", "super_admin");
  }

  // 2. Filter Search (Nama atau Email)
  if (queryParam) {
    mainQuery = mainQuery.or(
      `full_name.ilike.%${queryParam}%,email.ilike.%${queryParam}%`
    );
  }

  // Hitung User Baru Bulan Ini
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // --- PARALLEL FETCHING ---
  const [totalUsersRes, buyersRes, merchantsRes, newUsersRes, usersPageRes] =
    await Promise.all([
      // Stat: Total User
      supabase.from("profiles").select("id", { count: "exact", head: true }),

      // Stat: Total Buyers
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "buyer"),

      // Stat: Total Merchants
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "merchant"),

      // Stat: New Users This Month
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString()),

      // Data Utama (Paginated & Filtered)
      mainQuery.range(start, end),
    ]);

  // --- DATA PROCESSING ---
  const users = usersPageRes.data || [];
  const totalCount = usersPageRes.count || 0;

  const totalUsersCount = totalUsersRes.count || 0;
  const buyersCount = buyersRes.count || 0;
  const merchantsCount = merchantsRes.count || 0;
  const newUsersCount = newUsersRes.count || 0;

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
    return `/admin-dashboard/users?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Manajemen Pengguna
        </h1>
        <p className="text-muted-foreground text-sm">
          Daftar seluruh akun yang terdaftar di platform Bemlanja.
        </p>
      </div>

      {/* --- STATS CARDS --- */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Pengguna
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Akun terdaftar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pembeli (Buyers)
            </CardTitle>
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
            <p className="text-xs text-muted-foreground mt-1">Pemilik toko</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">User Baru</CardTitle>
            <UserPlus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{newUsersCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Bulan ini</p>
          </CardContent>
        </Card>
      </div>

      {/* --- TOOLBAR: TABS & SEARCH --- */}
      <div className="flex flex-col-reverse md:flex-row md:items-center justify-between gap-4">
        {/* URL-Based Tabs */}
        <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground w-full md:w-auto">
          <TabLink
            href={buildLink(1, "all")}
            active={currentTab === "all"}
            label="Semua"
          />
          <TabLink
            href={buildLink(1, "buyer")}
            active={currentTab === "buyer"}
            label="Buyers"
          />
          <TabLink
            href={buildLink(1, "merchant")}
            active={currentTab === "merchant"}
            label="Merchants"
          />
          <TabLink
            href={buildLink(1, "admin")}
            active={currentTab === "admin"}
            label="Admins"
          />
        </div>

        {/* Search Component */}
        <UserSearch />
      </div>

      {/* --- MAIN CONTENT --- */}
      <Card>
        <CardContent className="p-0">
          <UserTable data={users} queryParam={queryParam} />

          {/* Pagination Controls */}
          <div className="p-4 flex flex-col md:flex-row items-center justify-between gap-4 border-t">
            <div className="text-sm text-muted-foreground">
              Menampilkan <b>{users.length > 0 ? start + 1 : 0}</b> -{" "}
              <b>{Math.min(end + 1, totalCount)}</b> dari <b>{totalCount}</b>{" "}
              pengguna
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

function UserTable({ data, queryParam }: { data: any[]; queryParam: string }) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        {queryParam ? (
          <>
            <Search className="h-10 w-10 mb-2 opacity-20" />
            <p>Pengguna "{queryParam}" tidak ditemukan.</p>
          </>
        ) : (
          <>
            <Users className="h-10 w-10 mb-2 opacity-20" />
            <p>Tidak ada data pengguna.</p>
          </>
        )}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12.5 pl-4">Avatar</TableHead>
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
              <Badge
                variant={
                  user.role === "super_admin"
                    ? "default"
                    : user.role === "merchant"
                    ? "secondary"
                    : "outline"
                }
              >
                {user.role === "super_admin" && (
                  <ShieldCheck className="w-3 h-3 mr-1" />
                )}
                {user.role}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {user.created_at
                ? new Date(user.created_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "-"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TabLink({
  active,
  href,
  label,
}: {
  active: boolean;
  href: string;
  label: string;
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
      {label}
    </Link>
  );
}
