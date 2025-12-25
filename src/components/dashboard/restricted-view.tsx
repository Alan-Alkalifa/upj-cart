import { AlertCircle, Lock, ShieldAlert } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export function RestrictedView({ status }: { status: "pending" | "rejected" }) {
  const isPending = status === "pending"

  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <Card className="max-w-md w-full border-2 border-muted shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {isPending ? (
              <Lock className="h-8 w-8 text-yellow-600" />
            ) : (
              <ShieldAlert className="h-8 w-8 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isPending ? "Menunggu Verifikasi" : "Akses Ditangguhkan"}
          </CardTitle>
          <CardDescription>
            {isPending 
              ? "Toko Anda sedang dalam proses peninjauan oleh tim admin." 
              : "Maaf, toko Anda telah dinonaktifkan karena pelanggaran kebijakan."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant={isPending ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Akses Terbatas</AlertTitle>
            <AlertDescription>
              {isPending
                ? "Anda tidak dapat mengakses dashboard sampai verifikasi selesai. Mohon tunggu 1x24 jam."
                : "Silakan hubungi admin kampus untuk informasi lebih lanjut mengenai pemulihan akun Anda."}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="justify-center">
          <Button variant="outline" asChild>
             {/* Allow them to go to settings in case they need to fix profile info, or just logout */}
             <Link href="mailto:admin@upj.ac.id">Hubungi Admin</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}