"use client"

import * as React from "react"
import Image from "next/image"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel"
import { Skeleton } from "@/components/ui/skeleton"

// UPDATE DATA BANNERS MENGGUNAKAN GAMBAR LOKAL
const AUTH_BANNERS = [
  {
    id: 1,
    url: "/12.png", // Pastikan file 1.png ada di folder public
    title: "Marketplace Civitas Akademika",
    subtitle: "Temukan produk unik karya mahasiswa dan dosen Universitas Pembangunan Jaya.",
  },
  {
    id: 2,
    url: "/13.png", // Pastikan file 2.png ada di folder public
    title: "Dukung Wirausaha Kampus",
    subtitle: "Beli produk teman sendiri, dukung pertumbuhan ekonomi kreatif di lingkungan kampus.",
  },
  {
    id: 3,
    url: "/14.png", // Pastikan file 3.png ada di folder public
    title: "Kemudahan Bertransaksi",
    subtitle: "Platform terintegrasi untuk jual beli yang aman, nyaman, dan terpercaya.",
  },
]

export function AuthCarousel() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  React.useEffect(() => {
    if (!api) return

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })

    const interval = setInterval(() => {
      api.scrollNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [api])

  if (!mounted) {
    return <Skeleton className="h-full w-full" />
  }

  return (
    <div className="relative h-full w-full text-white overflow-hidden">
      <Carousel 
        setApi={setApi} 
        className="h-full w-full" 
        opts={{ loop: true }}
      >
        <CarouselContent className="h-full ml-0">
          {AUTH_BANNERS.map((banner) => (
            <CarouselItem key={banner.id} className="h-full pl-0 relative">
              <div className="relative h-full w-full">
                <Image
                  src={banner.url}
                  alt={banner.title}
                  fill
                  className="object-cover brightness-[0.6]"
                  priority={banner.id === 1} // Prioritaskan gambar pertama
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
                
                {/* Overlay Text */}
                <div className="absolute inset-0 opacity-90" />

                <div className="absolute bottom-0 left-0 right-0 p-12 z-20">
                  <div className="max-w-xl space-y-4">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight drop-shadow-md text-primary">
                      {banner.title}
                    </h2>
                    <p className="text-lg text-white/90 leading-relaxed font-medium">
                      {banner.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dots Indicator */}
      <div className="absolute top-12 left-12 flex gap-2 z-30">
        {AUTH_BANNERS.map((_, index) => (
          <button
            key={index}
            className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
              current === index 
                ? "w-8 bg-white" 
                : "w-2 bg-white/40 hover:bg-white/60"
            }`}
            onClick={() => api?.scrollTo(index)}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}