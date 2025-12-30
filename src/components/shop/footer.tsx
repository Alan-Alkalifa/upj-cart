import { getPlatformSettings } from "@/utils/get-settings"
import { Store, Mail, MapPin } from "lucide-react"
import Link from "next/link"

export async function Footer() {
  const settings = await getPlatformSettings()

  return (
    <footer className="border-t bg-muted/40 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1 rounded-md">
                <Store className="h-6 w-6" />
              </div>
              <h3 className="font-bold text-lg tracking-tight">{settings.platform_name}</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Platform jual beli resmi Universitas Pembangunan Jaya. 
              Mendukung wirausaha dari civitas akademika UPJ.
            </p>
          </div>

          {/* Layanan */}
          <div>
            <h4 className="font-semibold mb-4">Layanan</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="#" className="hover:text-primary transition-colors">Bantuan</Link></li>
              <li>
                <Link href="/merchant-register" className="hover:text-primary transition-colors">
                  Daftar sebagai Mitra
                </Link>
              </li>
              <li><Link href="#" className="hover:text-primary transition-colors">Pengembalian Dana</Link></li>
            </ul>
          </div>

          {/* Jelajahi */}
          <div>
            <h4 className="font-semibold mb-4">Jelajahi</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/search" className="hover:text-primary transition-colors">Semua Produk</Link></li>
              <li><Link href="#" className="hover:text-primary transition-colors">Kategori Populer</Link></li>
              <li><Link href="/merchant-register" className="hover:text-primary transition-colors">Daftar Mitra Toko</Link></li>
            </ul>
          </div>

          {/* Kontak */}
          <div>
            <h4 className="font-semibold mb-4">Hubungi Kami</h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{settings.support_email}</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Jl. Cendrawasih Raya Blok B7/P, Sawah Baru, Kec. Ciputat, Tangerang Selatan.
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} {settings.platform_name}. All rights reserved.
        </div>
      </div>
    </footer>
  )
}