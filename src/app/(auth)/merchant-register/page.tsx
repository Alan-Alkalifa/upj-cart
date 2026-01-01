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
        toast.error("Registration Failed", { description: res.error });
      } else {
        toast.success("Registration Successful!");
        router.push(`/verify-email-sign-up?email=${encodeURIComponent(values.email)}`);
      }
    });
  }

  return (
    // UI UPDATED: Hapus wrapper container, sesuaikan Card agar seamless dengan layout split
    <Card className="w-full border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center gap-3">
          <div>
            <CardTitle className="text-2xl font-bold">Register as Merchant</CardTitle>
            <CardDescription>Fill in the owner details and your merchant information.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            
            {/* --- INFO PEMILIK --- */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Owner Information</h3>
                <Separator className="flex-1" />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control} name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl><Input placeholder="Budi Santoso" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control} name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campus Email</FormLabel>
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
                      <FormLabel>Password</FormLabel>
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
                      <FormLabel>Confirm Password</FormLabel>
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
              <div className="flex items-center gap-2">
                 <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Merchant Information</h3>
                 <Separator className="flex-1" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control} name="storeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant Name</FormLabel>
                      <FormControl><Input placeholder="Hima Store" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control} name="storeSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Merchant URL (Slug)</FormLabel>
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
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Menjual..." className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" size="lg" className="w-full mt-4" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Register Merchant
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}