"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/auth-schemas";
import { login, resendVerificationEmail } from "@/app/(auth)/actions";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, MailWarning, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client"; 

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";

export default function LoginPage() {
  const [isPending, startTransition] = useTransition();
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // --- LOGIKA: DETEKSI TOKEN HASH ---
  useEffect(() => {
    const handleHashSession = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        try {
          const params = new URLSearchParams(hash.substring(1)); 
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            const toastId = toast.loading("Memverifikasi sesi...");
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            if (!error) {
              toast.dismiss(toastId);
              toast.success("Login Berhasil!");
              window.history.replaceState(null, "", window.location.pathname);
              router.push("/merchant"); 
              router.refresh();
            } else {
              toast.error("Gagal memulihkan sesi.");
            }
          }
        } catch (e) {
          console.error("Error parsing hash:", e);
        }
      }
    };
    handleHashSession();
  }, [supabase, router]);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onResendClick = (email: string) => {
    toast.promise(async () => {
      const res = await resendVerificationEmail(email);
      if (res?.error) throw new Error(res.error);
      return "Berhasil dikirim!";
    }, {
      loading: "Mengirim email...",
      success: "Link baru terkirim! Cek inbox/spam.",
      error: (err) => `Gagal: ${err.message}`,
    });
  };

function onSubmit(values: z.infer<typeof loginSchema>) {
    setUnverifiedEmail(null); 
    startTransition(async () => {
      const res = await login(values);

      if (res?.error) {
        if (res.code === "email_not_verified" || res.error.includes("not confirmed")) {
          setUnverifiedEmail(values.email);
          toast.error("Akun Belum Aktif");
        } else {
          toast.error("Gagal Masuk", { description: res.error });
        }
      } 
      // TAMBAHKAN BLOK INI:
      else if (res?.success) {
        toast.success("Login Berhasil!"); // Munculkan toast
        router.push(res.redirectUrl);     // Redirect manual di client
        router.refresh();                 // Refresh untuk update state auth di layout
      }
    });
  }

  return (
    // Update Layout: Hapus bg-muted/40 (sudah di layout parent), jaga centering
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Masuk</CardTitle>
          <CardDescription>Akses akun belanja atau toko Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              {unverifiedEmail && (
                <Alert variant="destructive" className="mb-4">
                  <MailWarning className="h-4 w-4" />
                  <AlertTitle>Email Belum Aktif</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p className="text-xs">Akun ini belum diverifikasi.</p>
                    <Button 
                      size="sm" variant="outline" type="button"
                      className="w-full bg-white text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => onResendClick(unverifiedEmail)}
                    >
                      Kirim Ulang Link Verifikasi
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input placeholder="email@contoh.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="/forgot-password" className="text-xs text-primary hover:underline font-medium" tabIndex={-1}>
                        Lupa Password?
                      </Link>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="******" 
                          className="pr-10"
                          {...field} 
                        />
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Masuk"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-center text-sm text-muted-foreground">
          Belum punya akun? <Link href="/register" className="ml-1 text-primary hover:underline font-medium">Daftar</Link>
        </CardFooter>
      </Card>
    </div>
  );
}