"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/utils/supabase/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updatePasswordSchema } from "@/lib/auth-schemas";
import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";

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

  // 1. Handle the Email Link (Hash Fragment)
  useEffect(() => {
    const handleSession = async () => {
      // Check for the hash fragment (Supabase sends tokens here by default)
      const hash = window.location.hash;
      
      if (hash && hash.includes("access_token")) {
        try {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken) {
            // Set the session on the CLIENT side immediately
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || "",
            });
            
            if (!error) {
              setIsSessionReady(true);
              // Clean the URL so the token isn't visible
              window.history.replaceState(null, "", window.location.pathname);
              return;
            }
          }
        } catch (e) {
          console.error("Token parsing error", e);
        }
      }

      // Fallback: Check if we already have an active session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsSessionReady(true);
      } else {
        // Only show error if we truly found no session and no hash
        // (Optional: You might want to wait a split second before showing this to avoid flash)
        setError("Link not valid or expired.");
      }
    };
    
    handleSession();
  }, [supabase]);

  const form = useForm<z.infer<typeof updatePasswordSchema>>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // 2. Submit Logic (Client-Side Only)
  function onSubmit(values: z.infer<typeof updatePasswordSchema>) {
    startTransition(async () => {
      // DIRECT CALL to Supabase. This bypasses Next.js Middleware/Server Actions entirely.
      const { error } = await supabase.auth.updateUser({
        password: values.password
      });

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password successfully updated!");
        
        // Sign out to force them to log in with the new password
        await supabase.auth.signOut(); 
        router.push("/login");
      }
    });
  }

  // --- Loading State ---
  if (!isSessionReady && !error) {
    return (
      <Card className="w-full border-0 shadow-none bg-transparent text-center py-10">
        <Loader2 className="h-10 w-10 animate-spin mx-auto text-primary mb-4" />
        <h3 className="font-semibold text-lg">Verifying Link...</h3>
      </Card>
    );
  }

  // --- Error State ---
  if (error) {
    return (
      <Alert variant="destructive" className="w-full max-w-sm bg-white shadow-lg mx-auto">
        <AlertTitle>Cannot Access</AlertTitle>
        <AlertDescription className="mt-2 flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">This page can only be accessed via a valid link from your email.</p>
          <Button variant="default" onClick={() => router.push("/login")}>Back to Login</Button>
        </AlertDescription>
      </Alert>
    );
  }

  // --- Main Form ---
  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-2xl font-bold">New Password</CardTitle>
        <CardDescription>Please create a new password for your account.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
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
                  <FormLabel>Confirm Password</FormLabel>
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
              Save Password
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}