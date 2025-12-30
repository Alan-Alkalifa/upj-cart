"use client"

import * as React from "react"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface ProductImageCarouselProps {
  images: string[]
  productName: string
}

export function ProductImageCarousel({ images, productName }: ProductImageCarouselProps) {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Auto-slide logic (Only if more than 1 image)
  React.useEffect(() => {
    if (!api || images.length <= 1) return

    // Update state on slide change
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })

    // Auto-slide every 5 seconds
    const interval = setInterval(() => {
      api.scrollNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [api, images.length])

  // --- SKELETON STATE (Before Client Load) ---
  if (!mounted) {
    return (
      <div className="aspect-square bg-muted rounded-2xl overflow-hidden border shadow-sm relative">
        <Skeleton className="w-full h-full" />
      </div>
    )
  }

  // --- FALLBACK: No Images ---
  if (images.length === 0) {
    return (
      <div className="aspect-square bg-muted rounded-2xl overflow-hidden border shadow-sm flex items-center justify-center text-muted-foreground bg-secondary/30 relative">
        No Image Available
        {/* <div className="absolute top-4 left-4">
           <Badge variant="secondary" className="backdrop-blur-md bg-white/80 text-black border-white/20 shadow-sm">
             Original
           </Badge>
        </div> */}
      </div>
    )
  }

  // --- MAIN CAROUSEL ---
  return (
    <div className="relative group">
      <Carousel 
        setApi={setApi} 
        className="w-full rounded-2xl overflow-hidden shadow-sm border bg-muted" 
        opts={{ loop: images.length > 1 }} 
      >
        <CarouselContent>
          {images.map((url, index) => (
            <CarouselItem key={index}>
              <div className="aspect-square relative overflow-hidden bg-white">
                <img 
                  src={url} 
                  alt={`${productName} - View ${index + 1}`} 
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-105" 
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Arrows (Only if > 1 image) */}
        {images.length > 1 && (
          <>
            <CarouselPrevious className="left-4 bg-white/80 hover:bg-white border-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
            <CarouselNext className="right-4 bg-white/80 hover:bg-white border-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
          </>
        )}

        {/* Floating Badge */}
        {/* <div className="absolute top-4 left-4 pointer-events-none z-10">
           <Badge variant="secondary" className="backdrop-blur-md bg-white/80 text-black border-white/20 shadow-sm">
             Original
           </Badge>
        </div> */}
      </Carousel>

      {/* Dots Indicator (Only if > 1 image) */}
      {images.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
          {images.map((_, index) => (
            <button
              key={index}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 shadow-sm",
                current === index 
                  ? "w-6 bg-white" 
                  : "w-1.5 bg-white/20 hover:bg-white/40"
              )}
              onClick={() => api?.scrollTo(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}