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

  useEffect(() => {
    const handleHashSession = async () => {
      const hash = window.location.hash;
      if (hash && hash.includes("access_token")) {
        try {
          const params = new URLSearchParams(hash.substring(1)); 
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            const toastId = toast.loading("Verifying session...");
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });

            if (!error) {
              toast.dismiss(toastId);
              toast.success("Login Successful!");
              window.history.replaceState(null, "", window.location.pathname);
              router.push("/merchant"); 
              router.refresh();
            } else {
              toast.error("Failed to verify session.");
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
      return "Successfully sent!";
    }, {
      loading: "Sending email...",
      success: "Successfully sent! Please check your inbox/spam.",
      error: (err) => `Failed: ${err.message}`,
    });
  };

  function onSubmit(values: z.infer<typeof loginSchema>) {
    setUnverifiedEmail(null); 
    startTransition(async () => {
      const res = await login(values);

      if (res?.error) {
        if (res.code === "email_not_verified" || res.error.includes("not confirmed")) {
          setUnverifiedEmail(values.email);
          toast.error("Account Not Verified", { description: "Please verify your email before logging in." });
        } else {
          toast.error("Login Failed", { description: res.error });
        }
      } 
      else if (res?.success) {
        toast.success("Login Successful!");
        router.push(res.redirectUrl);
        router.refresh();
      }
    });
  }

  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl font-bold">Login</CardTitle>
        <CardDescription>Access your shopping or store account.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            {unverifiedEmail && (
              <Alert variant="destructive" className="mb-4">
                <MailWarning className="h-4 w-4" />
                <AlertTitle>Email Not Verified</AlertTitle>
                <AlertDescription className="mt-2 space-y-2">
                  <p className="text-xs">This account has not been verified.</p>
                  <Button 
                    size="sm" variant="outline" type="button"
                    className="w-full bg-white text-destructive border-destructive hover:bg-destructive/10"
                    onClick={() => onResendClick(unverifiedEmail)}
                  >
                    Resend Verification Link
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
                      Forgot Password?
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
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center px-0 pb-0 text-sm text-muted-foreground">
        Don't have an account? <Link href="/register" className="ml-1 text-primary hover:underline font-medium">Register</Link>
      </CardFooter>
    </Card>
  );
}