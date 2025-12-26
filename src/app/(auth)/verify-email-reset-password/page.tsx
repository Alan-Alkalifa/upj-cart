import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { MailCheck } from "lucide-react";

export default function VerifyEmailResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="mx-auto bg-primary/10 p-4 rounded-full mb-4">
            <MailCheck className="h-10 w-10 text-primary" />
          </div>
          <CardTitle>Cek Email Anda</CardTitle>
          <CardDescription>
            Instruksi reset password telah dikirim.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Silakan cek inbox (dan folder spam). Klik link di dalamnya untuk membuat password baru.
          </p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Kembali ke Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}