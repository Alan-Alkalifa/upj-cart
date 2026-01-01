import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function VerifyEmailResetPasswordPage() {
  return (
    // UI UPDATED: Hapus wrapper div, gunakan Card transparan
    <Card className="w-full border-0 shadow-none bg-transparent text-center">
      <CardHeader className="px-0 pt-0">
        <div className="mx-auto bg-primary/10 p-4 rounded-full mb-6 w-fit">
          <MailCheck className="h-10 w-10 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold">Cek Email Anda</CardTitle>
        <CardDescription>
          Instruksi reset password telah dikirim.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <p className="text-sm text-muted-foreground">
          Silakan cek inbox (dan folder spam). Klik link di dalamnya untuk membuat password baru.
        </p>
      </CardContent>
      <CardFooter className="justify-center px-0 pb-0">
        <Button asChild variant="outline" className="w-full">
          <Link href="/login">Kembali ke Login</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}