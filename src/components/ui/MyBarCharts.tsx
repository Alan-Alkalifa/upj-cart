"use client"

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"
import { 
  ChartConfig, 
  ChartContainer, 
  ChartLegend, 
  ChartLegendContent, 
  ChartTooltip, 
  ChartTooltipContent 
} from "@/components/ui/chart"

// 1. Define your data
const chartData = [
  { month: "January", desktop: 186, mobile: 80 },
  { month: "February", desktop: 305, mobile: 200 },
  { month: "March", desktop: 237, mobile: 120 },
  { month: "April", desktop: 73, mobile: 190 },
  { month: "May", desktop: 209, mobile: 130 },
  { month: "June", desktop: 214, mobile: 140 },
]

// 2. Define your configuration 
// This maps your data keys (desktop/mobile) to labels and colors.
// "hsl(var(--chart-n))" refers to the CSS variables added by shadcn to your globals.css
const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
  mobile: {
    label: "Mobile",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig

export function MyBarChart() {
  return (
    <div className="w-full max-w-lg p-4">
      <h2 className="mb-4 text-lg font-semibold">Monthly Traffic</h2>
      
      {/* 3. Wrap everything in ChartContainer */}
      <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
        <BarChart accessibilityLayer data={chartData}>
          <CartesianGrid vertical={false} />
          
          <XAxis
            dataKey="month"
            tickLine={false}
            tickMargin={10}
            axisLine={false}
            tickFormatter={(value) => value.slice(0, 3)}
          />

          {/* This uses the shadcn tooltip component for styling */}
          <ChartTooltip content={<ChartTooltipContent />} />
          
          <ChartLegend content={<ChartLegendContent />} />

          {/* radius: rounds the corners of the bars
            fill: uses the CSS variable mapped in your chartConfig 
          */}
          <Bar dataKey="desktop" fill="var(--color-desktop)" radius={4} />
          <Bar dataKey="mobile" fill="var(--color-mobile)" radius={4} />
        </BarChart>
      </ChartContainer>
    </div>
  )
}