"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/auth-schemas";
import { forgotPassword } from "@/app/(auth)/actions";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Mail } from "lucide-react"; // Removed ArrowLeft as it wasn't used

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<z.infer<typeof forgotPasswordSchema>>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: z.infer<typeof forgotPasswordSchema>) {
    startTransition(async () => {
      const res = await forgotPassword(values);
      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success("Reset link sent!");
        router.push("/verify-email-reset-password");
      }
    });
  }

  return (
    <Card className="w-full border-0 shadow-none bg-transparent">
      <CardHeader className="px-0">
        <CardTitle className="text-2xl font-bold">Forgot Password?</CardTitle>
        <CardDescription>Enter your email to receive a reset link.</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="email@contoh.com" className="pl-9" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* UPDATED BUTTON LOGIC HERE */}
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Send Reset Link"
              )}
            </Button>

          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center px-0 pb-0">
        <Button variant="link" asChild className="text-muted-foreground h-auto p-0">
          <Link href="/login" className="flex items-center gap-2 hover:text-primary transition-colors">
            Login here
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}