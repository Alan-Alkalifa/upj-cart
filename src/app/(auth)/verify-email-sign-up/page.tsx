import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export default async function VerifyEmailSignUpPage(props: { searchParams: Promise<{ email?: string }> }) {
  const searchParams = await props.searchParams;
  const email = searchParams.email || "your email address";

  return (
    // UI UPDATED: Hapus wrapper div, gunakan Card transparan & borderless
    <Card className="w-full border-0 shadow-none bg-transparent text-center">
      <CardHeader className="px-0 pt-0">
        <div className="mx-auto bg-primary/10 p-4 rounded-full mb-6 w-fit">
          <MailCheck className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Cek Email Anda</CardTitle>
        <CardDescription className="text-base mt-2">
          Link verifikasi telah dikirim ke: <br />
          <span className="font-medium text-foreground">{email}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Silakan periksa kotak masuk (atau folder spam) Anda dan klik link yang diberikan untuk mengaktifkan akun.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 px-0 pb-0">
        <Button asChild className="w-full" variant="outline">
          <Link href="/login">Kembali ke Halaman Login</Link>
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Salah email? <Link href="/register" className="text-primary hover:underline">Daftar ulang</Link>
        </p>
      </CardFooter>
    </Card>
  );
}