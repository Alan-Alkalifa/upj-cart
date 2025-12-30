"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Cek apakah user sudah pernah berinteraksi (accept/reject)
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  // Handler untuk MENERIMA
  const acceptCookies = () => {
    setIsClosing(true);
    localStorage.setItem("cookie-consent", "true");
    setTimeout(() => setIsVisible(false), 300);
  };

  // Handler untuk MENOLAK
  const declineCookies = () => {
    setIsClosing(true);
    // Simpan status 'false' agar banner tidak muncul lagi,
    // tapi secara logika aplikasi tahu user menolak tracking.
    localStorage.setItem("cookie-consent", "false"); 
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 p-4 transition-all duration-300 ease-in-out sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-md",
        isClosing ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
      )}
    >
      <div className="flex flex-col gap-4 rounded-lg border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-5 shadow-lg ring-1 ring-black/5 dark:bg-card dark:ring-white/10">
        {/* Header & Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Cookie className="h-4 w-4" />
            </div>
            <h3 className="font-semibold leading-none tracking-tight">
              Pilihan Cookies
            </h3>
          </div>
          {/* Tombol X (Close) bisa dianggap sebagai Decline atau Dismiss */}
          <button
            onClick={declineCookies}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <p className="text-sm text-muted-foreground">
          Kami menggunakan cookies esensial agar website dapat berjalan. Kami juga ingin menggunakan cookies tambahan untuk meningkatkan pengalaman Anda.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button 
            onClick={declineCookies} 
            variant="outline" 
            size="sm" 
            className="w-full sm:w-auto"
          >
            Tolak Semua
          </Button>
          <Button 
            onClick={acceptCookies} 
            size="sm" 
            className="w-full sm:w-auto"
          >
            Izinkan Semua
          </Button>
        </div>
      </div>
    </div>
  );
}