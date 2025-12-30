"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar, Inbox } from "lucide-react" // Added Inbox for empty state icon

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"

interface ChartDataPoint {
  date: string
  label: string
  revenue: number
  orders: number
}

interface PlatformTrendChartProps {
  data: ChartDataPoint[]
  currentRange: string
}

const chartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--primary))",
  },
} satisfies ChartConfig

export function PlatformTrendChart({ data, currentRange }: PlatformTrendChartProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const onRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-left sm:text-left">
          <CardTitle>Platform Revenue Trend</CardTitle>
          <CardDescription>
            Showing gross transaction volume for the selected period.
          </CardDescription>
        </div>
        
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block"/>
            <Select value={currentRange} onValueChange={onRangeChange}>
              <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto">
                  <SelectValue placeholder="Last 30 days" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 3 months</SelectItem>
                  <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
        </div>
      </CardHeader>
      
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        {/* --- UX IMPROVEMENT: EMPTY STATE CHECK --- */}
        {data.length === 0 ? (
          <div className="flex h-[250px] w-full flex-col items-center justify-center rounded-lg border border-dashed bg-muted/10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-sm font-semibold">No transactions found</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              There is no completed order data for the selected range.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
            <BarChart accessibilityLayer data={data}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" strokeOpacity={0.5} />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={32}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    labelKey="date"
                    indicator="dot"
                    formatter={(value, name) => {
                       if (name === "revenue") return `Rp ${value.toLocaleString("id-ID")}`
                       return value
                    }}
                  />
                }
              />
              <Bar 
                  dataKey="revenue" 
                  fill="var(--color-revenue)" 
                  radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}