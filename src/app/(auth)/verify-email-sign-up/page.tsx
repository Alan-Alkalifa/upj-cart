import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export default async function VerifyEmailSignUpPage(props: { searchParams: Promise<{ email?: string }> }) {
  const searchParams = await props.searchParams;
  const email = searchParams.email || "email anda";

  return (
    // Update: Gunakan flex min-h-screen p-4 tanpa bg khusus
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center shadow-lg">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-4">
              <MailCheck className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Cek Email Anda</CardTitle>
          <CardDescription className="text-base mt-2">
            Link verifikasi telah dikirim ke: <br />
            <span className="font-medium text-foreground">{email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Silakan periksa kotak masuk (atau folder spam) Anda dan klik link yang diberikan untuk mengaktifkan akun.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button asChild className="w-full" variant="outline">
            <Link href="/login">Kembali ke Halaman Login</Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Salah email? <Link href="/register" className="text-primary hover:underline">Daftar ulang</Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}