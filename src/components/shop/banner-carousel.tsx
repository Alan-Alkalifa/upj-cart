"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel"

const BANNERS = [
  {
    id: 1,
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=2070&auto=format&fit=crop",
    title: "Dukung Produk Teman Kampus!",
    subtitle: "Temukan kreasi unik dari mahasiswa UPJ.",
    link: "/search?sort=newest"
  },
  {
    id: 2,
    url: "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=2070&auto=format&fit=crop",
    title: "Jajanan & Katering",
    subtitle: "Lapar saat nugas? Pesan di sini.",
    link: "/search?category=food"
  },
  {
    id: 3,
    url: "https://images.unsplash.com/photo-1555529733-0e670560f7e1?q=80&w=2070&auto=format&fit=crop",
    title: "Jasa Desain & Cetak",
    subtitle: "Butuh bantuan tugas? Cari freelancer kampus.",
    link: "/search?category=services"
  },
]

export function BannerCarousel() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)

  React.useEffect(() => {
    if (!api) return

    // Update state saat slide berubah
    api.on("select", () => {
      setCurrent(api.selectedScrollSnap())
    })

    // Auto-slide setiap 5 detik
    const interval = setInterval(() => {
      api.scrollNext()
    }, 5000)

    return () => clearInterval(interval)
  }, [api])

  return (
    <div className="relative group">
      <Carousel setApi={setApi} className="w-full rounded-2xl overflow-hidden shadow-xl" opts={{ loop: true }}>
        <CarouselContent>
          {BANNERS.map((banner) => (
            <CarouselItem key={banner.id}>
              <div className="relative aspect-[2/1] md:aspect-[3/1] lg:aspect-[3.5/1] w-full bg-muted">
                <img 
                  src={banner.url} 
                  alt={banner.title} 
                  className="object-cover w-full h-full brightness-75 transition-transform duration-1000 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-6 md:p-12">
                  <div className="text-white max-w-2xl">
                    <h2 className="text-2xl md:text-4xl lg:text-5xl font-bold mb-3 tracking-tight drop-shadow-md">
                      {banner.title}
                    </h2>
                    <p className="text-white/90 text-sm md:text-lg mb-6 drop-shadow-md">
                      {banner.subtitle}
                    </p>
                    <Button asChild size="lg" className="bg-white text-black hover:bg-white/90 font-semibold rounded-full px-8 shadow-lg">
                      <Link href={banner.link}>Mulai Belanja <ArrowRight className="ml-2 h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {/* Navigasi Desktop Only */}
        <CarouselPrevious className="left-4 bg-white/20 hover:bg-white/40 border-none text-white hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity" />
        <CarouselNext className="right-4 bg-white/20 hover:bg-white/40 border-none text-white hidden md:flex opacity-0 group-hover:opacity-100 transition-opacity" />
      </Carousel>

      {/* Dots Indicator */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {BANNERS.map((_, index) => (
          <button
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              current === index ? "w-8 bg-white" : "w-2 bg-white/50"
            }`}
            onClick={() => api?.scrollTo(index)}
          />
        ))}
      </div>
    </div>
  )
}