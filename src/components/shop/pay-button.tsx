// src/components/shop/pay-button.tsx
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

// REMOVED: declare global block to avoid conflict with src/types/global.d.ts

interface PayButtonProps {
  snapToken: string;
  orderId: string;
}

export function PayButton({ snapToken, orderId }: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Load Midtrans Snap Script
  useEffect(() => {
    const snapScript = process.env.NEXT_PUBLIC_MIDTRANS_URL || "https://app.sandbox.midtrans.com/snap/snap.js";
    const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || "";
    
    const scriptId = "midtrans-script";
    if (!document.getElementById(scriptId)) {
      const script = document.createElement("script");
      script.src = snapScript;
      script.id = scriptId;
      script.setAttribute("data-client-key", clientKey);
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handlePay = () => {
    if (!snapToken) {
      toast.error("Token pembayaran tidak valid.");
      return;
    }

    setLoading(true);
    // window.snap is now typed correctly from src/types/global.d.ts
    if (typeof window.snap !== "undefined") {
      window.snap.pay(snapToken, {
        onSuccess: function (result: any) {
          toast.success("Pembayaran Berhasil!");
          router.refresh();
          setLoading(false);
        },
        onPending: function (result: any) {
          toast.info("Menunggu pembayaran...");
          router.refresh();
          setLoading(false);
        },
        onError: function (result: any) {
          toast.error("Pembayaran Gagal");
          setLoading(false);
        },
        onClose: function () {
          setLoading(false);
        },
      });
    } else {
      toast.error("Sistem pembayaran belum siap. Coba refresh halaman.");
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handlePay} 
      disabled={loading} 
      size="sm" 
      className="w-full text-base shadow-md"
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      Bayar Sekarang
    </Button>
  );
}