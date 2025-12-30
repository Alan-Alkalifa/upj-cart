import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { getPlatformSettings } from "@/utils/get-settings";
import { createClient } from "@/utils/supabase/server";
import { Wrench, Mail } from "lucide-react";
import { FloatingChat } from "@/components/chat/floating-chat";
import { CookieConsent } from "@/components/ui/cookie-consent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// --- SEO CONFIGURATION ---
export const metadata: Metadata = {
  // Base URL is required for Open Graph images to work correctly
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://upj-cart.com"),
  title: {
    default: "UPJ Cart - Marketplace Universitas Pembangunan Jaya",
    template: "%s | UPJ Cart" 
  },
  description: "Platform jual beli resmi untuk civitas akademika Universitas Pembangunan Jaya.",
  openGraph: {
    title: "UPJ Cart",
    description: "Belanja produk dari civitas akademika UPJ.",
    url: "https://upj-cart.com",
    siteName: "UPJ Cart",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "UPJ Cart",
    description: "Marketplace Civitas UPJ",
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // 1. Ambil Settings Global
  const settings = await getPlatformSettings();
  const supabase = await createClient();

  // 2. Cek User & Role (Untuk Bypass Maintenance)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isSuperAdmin = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isSuperAdmin = profile?.role === "super_admin";
  }

  // --- LOGIC: MAINTENANCE MODE ---
  // Jika maintenance aktif DAN user bukan super admin -> Tampilkan Layar Maintenance
  if (settings.is_maintenance_mode && !isSuperAdmin) {
    return (
      <html lang="id">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased flex h-screen w-full flex-col items-center justify-center bg-gray-50 text-center p-6`}
        >
          <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl border border-gray-100">
            {/* Icon Animasi */}
            <div className="flex justify-center">
              <div className="h-24 w-24 bg-orange-100 rounded-full flex items-center justify-center animate-pulse">
                <Wrench className="h-10 w-10 text-orange-600" />
              </div>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                Sedang Dalam Perbaikan
              </h1>
              <p className="text-gray-500 leading-relaxed">
                Mohon maaf, <b>{settings.platform_name}</b> sedang menjalani
                pemeliharaan sistem terjadwal untuk meningkatkan layanan kami.
              </p>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                <Mail className="h-4 w-4" />
                <span>Butuh bantuan mendesak?</span>
              </div>
              <a
                href={`mailto:${settings.support_email}`}
                className="mt-2 inline-block font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                {settings.support_email}
              </a>
            </div>

            <div className="text-xs text-gray-300">
              &copy; {new Date().getFullYear()} {settings.platform_name}
            </div>
          </div>
        </body>
      </html>
    );
  }
  // --- END LOGIC MAINTENANCE ---

  // Tampilan Normal
  return (
    <html lang="id">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster />
        <CookieConsent />
        {user && <FloatingChat currentUserId={user.id} />}
      </body>
    </html>
  );
}