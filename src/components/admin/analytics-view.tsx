"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Users, Eye, MousePointerClick, TrendingUp } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts"

interface AnalyticsData {
  stats: {
    users: number
    views: number
    sessions: number
  }
  pages: {
    title: string
    path: string
    views: number
  }[]
}

export function AnalyticsView({ data }: { data: AnalyticsData }) {
  // Format angka (ribuan pakai K)
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("id-ID", { notation: "compact", compactDisplay: "short" }).format(num)
  }

  // Data Summary Cards
  const cards = [
    {
      title: "Total Pengunjung",
      value: data.stats.users,
      icon: Users,
      desc: "User aktif dalam 28 hari terakhir",
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Total Tampilan",
      value: data.stats.views,
      icon: Eye,
      desc: "Halaman dilihat (Pageviews)",
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Total Sesi",
      value: data.stats.sessions,
      icon: MousePointerClick,
      desc: "Kunjungan interaktif",
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
  ]

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* 1. SUMMARY CARDS */}
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${card.bg}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatNumber(card.value)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {card.desc}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 2. TOP PAGES CHART */}
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Halaman Terpopuler
            </CardTitle>
            <CardDescription>
              5 Halaman dengan kunjungan tertinggi bulan ini.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-0">
            <div className="h-[300px] w-full">
               {data.pages.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.pages} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="title" 
                        type="category" 
                        width={150} 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(val) => val.length > 20 ? val.substring(0, 20) + '...' : val} 
                      />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Bar dataKey="views" radius={[0, 4, 4, 0]} barSize={30}>
                        {data.pages.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? "#3b82f6" : "#94a3b8"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
               ) : (
                 <div className="flex h-full items-center justify-center text-muted-foreground">
                   Belum ada data analytics yang cukup.
                 </div>
               )}
            </div>
          </CardContent>
        </Card>

        {/* 3. QUICK INFO / RECOMMENDATION */}
        <Card>
           <CardHeader>
             <CardTitle>Tips Optimasi</CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="text-sm text-muted-foreground">
               Berdasarkan data trafik Anda:
             </div>
             <ul className="space-y-3 text-sm">
                <li className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 mt-1.5" />
                  <span>Halaman <b>{data.pages[0]?.title || "Utama"}</b> adalah yang paling diminati. Pastikan stok produk di sana aman.</span>
                </li>
                <li className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5" />
                  <span>Rasio views ke sessions adalah <b>{data.stats.sessions ? (data.stats.views / data.stats.sessions).toFixed(1) : 0}</b>. User rata-rata melihat segitu halaman per kunjungan.</span>
                </li>
             </ul>
           </CardContent>
        </Card>
      </div>
    </div>
  )
}