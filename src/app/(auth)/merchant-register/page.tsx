"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { merchantRegisterSchema } from "@/lib/auth-schemas";
import { registerMerchant } from "@/app/(auth)/actions";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Store, Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function MerchantRegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<z.infer<typeof merchantRegisterSchema>>({
    resolver: zodResolver(merchantRegisterSchema),
    defaultValues: {
      fullName: "", email: "", password: "", confirmPassword: "",
      storeName: "", storeSlug: "", description: "",
    },
  });

  function onSubmit(values: z.infer<typeof merchantRegisterSchema>) {
    startTransition(async () => {
      const res = await registerMerchant(values);
      if (res?.error) {
        toast.error("Gagal Mendaftar", { description: res.error });
      } else {
        toast.success("Pendaftaran Berhasil!");
        router.push(`/verify-email-sign-up?email=${encodeURIComponent(values.email)}`);
      }
    });
  }

  return (
    // Update Layout: Hapus kelas bg-, gunakan container untuk form panjang
    // min-h-screen sudah dihandle layout parent
    <div className="container mx-auto max-w-2xl px-4 py-10">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Buka Toko Baru</CardTitle>
              <CardDescription>Isi detail pemilik dan informasi toko Anda.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* --- INFO PEMILIK --- */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informasi Pemilik</h3>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control} name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl><Input placeholder="Budi Santoso" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Kampus</FormLabel>
                        <FormControl><Input type="email" placeholder="nama@student.upj.ac.id" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control} name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password Akun</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showPassword ? "text" : "password"} placeholder="*********" className="pr-10" {...field} />
                            <Button
                              type="button" variant="ghost" size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Konfirmasi Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input type={showConfirmPassword ? "text" : "password"} placeholder="*********" className="pr-10" {...field} />
                            <Button
                              type="button" variant="ghost" size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* --- INFO TOKO --- */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informasi Toko</h3>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control} name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Toko</FormLabel>
                        <FormControl><Input placeholder="Hima Store" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control} name="storeSlug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Toko (Slug)</FormLabel>
                        <FormControl><Input placeholder="hima-store" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control} name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl><Textarea placeholder="Menjual..." className="min-h-[100px]" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button type="submit" size="lg" disabled={isPending}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Daftarkan Toko
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}