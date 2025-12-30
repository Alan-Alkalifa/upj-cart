import { Suspense } from "react"
import { Metadata } from "next"
import { fetchDashboardAnalytics } from "@/app/actions/analytics"
import { AnalyticsView } from "@/components/admin/analytics-view"
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"

// [FIX] Force dynamic rendering:
// Memaksa Next.js untuk selalu mengambil data baru dari server (tidak di-cache)
// Ini penting agar data Analytics selalu "Fresh" setiap kali halaman dibuka.
export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "Analytics Dashboard - Super Admin",
}

export default async function AnalyticsPage() {
  // 1. Fetch Data dari Server Action
  // Mengambil data 28 hari terakhir secara default
  const analyticsData = await fetchDashboardAnalytics(28)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-2">
        {/* Pastikan admin-breadcrumbs.tsx sudah diupdate untuk menerima prop 'items' */}
        <AdminBreadcrumbs 
          items={[
            { label: "Dashboard", href: "/admin" },
            { label: "Analytics", href: "/admin/analytics", active: true },
          ]} 
        />
        <h1 className="text-3xl font-bold tracking-tight">Website Analytics</h1>
        <p className="text-muted-foreground">
          Laporan performa website real-time dari Google Analytics 4.
        </p>
      </div>

      {/* Visualisasi Data dengan Loading State */}
      <Suspense fallback={<AnalyticsLoading />}>
        <AnalyticsView data={analyticsData} />
      </Suspense>
    </div>
  )
}

// Komponen Loading Skeleton (Placeholder saat data sedang diambil)
function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      {/* Skeleton untuk 3 Kartu Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      
      {/* Skeleton untuk Grafik */}
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="col-span-2 h-[350px] rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    </div>
  )
}
