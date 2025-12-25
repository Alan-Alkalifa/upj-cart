"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker" // Standard dependency for Shadcn Calendar
import { useRouter, useSearchParams } from "next/navigation"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar" //
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover" //

export function DateRangeFilter({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Initialize state from URL params
  const initialDate: DateRange | undefined = {
    from: searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined,
    to: searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined,
  }

  const [date, setDate] = React.useState<DateRange | undefined>(initialDate)

  // Update URL when date changes
  const onSelect = (newDate: DateRange | undefined) => {
    setDate(newDate)
    
    if (newDate?.from) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("from", newDate.from.toISOString())
      
      if (newDate.to) {
        params.set("to", newDate.to.toISOString())
      } else {
        params.delete("to")
      }
      
      router.push(`?${params.toString()}`)
    } else {
      // Clear filter
      router.push(window.location.pathname)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-65 justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/y")} - {format(date.to, "dd/MM/y")}
                </>
              ) : (
                format(date.from, "dd/MM/y")
              )
            ) : (
              <span>Filter Tanggal</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onSelect}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}