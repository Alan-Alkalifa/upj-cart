"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { useRouter, useSearchParams } from "next/navigation"
import { Calendar } from "lucide-react"

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

// Define the shape of data passed from server
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
  orders: {
    label: "Orders",
    color: "hsl(var(--muted-foreground))",
  },
} satisfies ChartConfig

export function PlatformTrendChart({ data, currentRange }: PlatformTrendChartProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Handle Range Change (updates URL)
  const onRangeChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("range", value)
    router.push(`?${params.toString()}`, { scroll: false })
  }

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Platform Revenue Trend</CardTitle>
          <CardDescription>
            Showing gross transaction volume for the selected period.
          </CardDescription>
        </div>
        
        {/* Date Range Selector */}
        <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground hidden sm:block"/>
            <Select value={currentRange} onValueChange={onRangeChange}>
            <SelectTrigger className="w-[160px] rounded-lg sm:ml-auto" aria-label="Select a value">
                <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
                <SelectItem value="7d" className="rounded-lg">Last 7 days</SelectItem>
                <SelectItem value="30d" className="rounded-lg">Last 30 days</SelectItem>
                <SelectItem value="90d" className="rounded-lg">Last 3 months</SelectItem>
                <SelectItem value="year" className="rounded-lg">This Year</SelectItem>
            </SelectContent>
            </Select>
        </div>
      </CardHeader>
      
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
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
                  labelKey="date" // Uses the full 'date' field from your data for the title
                  indicator="dot"
                  formatter={(value, name) => {
                     // Custom formatting for Tooltip
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
      </CardContent>
    </Card>
  )
}