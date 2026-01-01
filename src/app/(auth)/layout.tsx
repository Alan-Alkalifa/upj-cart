import { ReactNode } from "react";
import { AuthCarousel } from "@/components/auth/auth-carousel";
import Link from "next/link";
import { Store } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      
      {/* KIRI: Carousel (Desktop Only) */}
      <div className="hidden lg:block h-full relative bg-muted">
        <AuthCarousel />
        
        <div className="absolute top-10 right-10 z-30">
          <Link href="/" className="flex items-center gap-2 group text-primary">
            <div className="bg-primary text-primary-foreground p-2 rounded-lg shadow-lg group-hover:bg-primary/90 transition-colors">
              <Store className="h-6 w-6" />
            </div>
            <span className="font-bold text-xl tracking-tight drop-shadow-md">
              UPJ MARKETPLACE
            </span>
          </Link>
        </div>
      </div>

      {/* KANAN: Form Content */}
      {/* UPDATE: Tambahkan 'min-h-screen' agar di Mobile form berada di tengah vertikal */}
      <div className="flex flex-col items-center justify-center p-6 md:p-12 bg-background relative min-h-screen lg:min-h-0">
        
        {/* Mobile Logo (Hanya muncul di Mobile) */}
        <div className="lg:hidden w-full mb-8 flex justify-center">
           <Link href="/" className="flex items-left gap-2 group">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-lg">
                <Store className="h-5 w-5" />
              </div>
              <span className="font-bold text-lg tracking-tight">UPJ MARKETPLACE</span>
           </Link>
        </div>

        <div className="w-full max-w-sm space-y-6">
          {children}
        </div>
      </div>
      
    </div>
  );
}