"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePasswordSchema } from "@/lib/auth-schemas";
import { updatePassword } from "@/app/(auth)/actions";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Ban, Eye, EyeOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function UpdatePasswordPage() {
  const [isPending, startTransition] = useTransition();
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    const handleSession = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        try {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            if (!error) {
              setIsSessionReady(true);
              window.history.replaceState(null, "", window.location.pathname);
              return;
            }
          }
        } catch (e) {
          console.error("Token error", e);
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsSessionReady(true);
      } else {
        setError("Link tidak valid atau kadaluarsa.");
      }
    };
    handleSession();
  }, [supabase]);

  const form = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  function onSubmit(values: z.infer<typeof updatePasswordSchema>) {
    startTransition(async () => {
      const res = await updatePassword(values);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Password berhasil diperbarui!");
        await supabase.auth.signOut(); 
        router.push("/login");
      }
    });
  }

  // Layout Konsisten: Gunakan p-4 tanpa bg
  const wrapperClass = "flex min-h-screen items-center justify-center p-4";

  if (!isSessionReady && !error) {
    return (
      <div className={wrapperClass}>
        <Card className="w-full max-w-sm text-center py-10">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
          <h3 className="font-semibold text-lg">Memverifikasi Link...</h3>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className={wrapperClass}>
        <Alert variant="destructive" className="max-w-sm bg-white shadow-lg">
          <Ban className="h-4 w-4" />
          <AlertTitle>Tidak Dapat Diakses</AlertTitle>
          <AlertDescription className="mt-2 flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Halaman ini hanya dapat diakses melalui link dari email.</p>
            <Button variant="outline" onClick={() => router.push("/login")}>Kembali ke Login</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Password Baru</CardTitle>
          <CardDescription>Silakan buat password baru Anda.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password Baru</FormLabel>
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
                        >
                          {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Konfirmasi Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="******" 
                          className="pr-10"
                          {...field} 
                        />
                        <Button
                          type="button" variant="ghost" size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Password
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}