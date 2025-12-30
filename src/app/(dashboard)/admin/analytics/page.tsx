import { Suspense } from "react"
import { Metadata } from "next"
import { fetchDashboardAnalytics } from "@/app/actions/analytics"
import { AnalyticsView } from "@/components/admin/analytics-view"
import { AdminBreadcrumbs } from "@/components/admin/admin-breadcrumbs"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "Analytics Dashboard - Super Admin",
}

export default async function AnalyticsPage() {
  // 1. Fetch Data dari Server Action (Google Analytics)
  // Default mengambil data 28 hari terakhir
  const analyticsData = await fetchDashboardAnalytics(28)

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header & Breadcrumbs */}
      <div className="flex flex-col gap-2">
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

      {/* Visualisasi Data */}
      <Suspense fallback={<AnalyticsLoading />}>
        <AnalyticsView data={analyticsData} />
      </Suspense>
    </div>
  )
}

// Komponen Loading Skeleton
function AnalyticsLoading() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="col-span-2 h-[350px] rounded-xl" />
        <Skeleton className="h-[350px] rounded-xl" />
      </div>
    </div>
  )
}