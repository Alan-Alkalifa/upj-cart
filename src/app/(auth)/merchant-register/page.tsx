"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { merchantRegisterSchema } from "@/lib/auth-schemas";
import { registerMerchant } from "@/app/(auth)/actions";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2, Store } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator"; //

export default function MerchantRegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  const form = useForm<z.infer<typeof merchantRegisterSchema>>({
    resolver: zodResolver(merchantRegisterSchema),
    defaultValues: {
      fullName: "", email: "", password: "",
      storeName: "", storeSlug: "", description: ""
    },
  });

  function onSubmit(values: z.infer<typeof merchantRegisterSchema>) {
    startTransition(async () => {
      const res = await registerMerchant(values);
      if (res?.error) {
        toast.error("Gagal Mendaftar", { description: res.error });
      } else {
        toast.success("Pendaftaran Berhasil!", { description: "Silakan cek email untuk verifikasi." });
        router.push(`/verify-email?email=${encodeURIComponent(values.email)}`)
      }
    });
  }

  return (
    <div className="container mx-auto max-w-2xl py-10 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Store className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Buka Toko Baru</CardTitle>
              <CardDescription>Isi detail pemilik dan informasi toko.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {/* Owner Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informasi Pemilik</h3>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Lengkap</FormLabel>
                        <FormControl><Input placeholder="Budi Santoso" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Kampus (Opsional)</FormLabel>
                        <FormControl><Input type="email" placeholder="budi@student.upj.ac.id" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password Akun</FormLabel>
                      <FormControl><Input type="password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Store Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Informasi Toko</h3>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="storeName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Toko</FormLabel>
                        <FormControl><Input placeholder="Hima Informatika" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="storeSlug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URL Toko (Slug)</FormLabel>
                        <FormControl><Input placeholder="hima-informatika" {...field} /></FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi Singkat</FormLabel>
                      <FormControl><Textarea placeholder="Menjual merchandise resmi..." {...field} /></FormControl>
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