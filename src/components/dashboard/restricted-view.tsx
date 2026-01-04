import { AlertCircle, Lock, ShieldAlert, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

// Interface disesuaikan dengan status di database: pending, active, suspended, rejected
interface RestrictedViewProps {
  status: "pending" | "rejected" | "suspended"
  settings: {
    platform_name: string
    support_email: string
  }
}

export function RestrictedView({ status, settings }: RestrictedViewProps) {
  const isPending = status === "pending"
  const isSuspended = status === "suspended"
  const isRejected = status === "rejected"

  // Menentukan Konten Berdasarkan Status
  const getContent = () => {
    if (isPending) {
      return {
        icon: <Lock className="h-8 w-8 text-yellow-600" />,
        title: "Menunggu Verifikasi",
        description: `Toko Anda sedang dalam proses peninjauan oleh tim admin ${settings.platform_name}.`,
        alertTitle: "Akses Terbatas",
        alertDescription: "Dashboard akan terbuka secara otomatis setelah verifikasi selesai (estimasi 1x24 jam).",
        variant: "default" as const
      }
    }
    
    if (isSuspended) {
      return {
        icon: <AlertTriangle className="h-8 w-8 text-amber-600" />,
        title: "Toko Ditangguhkan",
        description: "Akses dashboard Anda telah dibatasi sementara waktu oleh pihak manajemen.",
        alertTitle: "Status Penangguhan",
        alertDescription: "Toko Anda tidak dapat menerima pesanan baru. Silakan hubungi admin untuk proses aktivasi kembali.",
        variant: "warning" as const // Pastikan variant warning tersedia di UI Alert Anda
      }
    }

    return {
      icon: <ShieldAlert className="h-8 w-8 text-destructive" />,
      title: "Akses Ditolak",
      description: "Mohon maaf, pengajuan toko Anda telah ditolak atau dinonaktifkan secara permanen.",
      alertTitle: "Pelanggaran Kebijakan",
      alertDescription: `Hubungi layanan dukungan ${settings.platform_name} untuk informasi lebih detail mengenai status akun Anda.`,
      variant: "destructive" as const
    }
  }

  const content = getContent()

  return (
    <div className="flex flex-1 items-center justify-center p-8 bg-muted/30 min-h-[60vh]">
      <Card className="max-w-md w-full border-2 border-muted shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            {content.icon}
          </div>
          <CardTitle className="text-2xl">
            {content.title}
          </CardTitle>
          <CardDescription>
            {content.description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <Alert variant={content.variant === "warning" ? "default" : content.variant}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{content.alertTitle}</AlertTitle>
            <AlertDescription>
              {content.alertDescription}
            </AlertDescription>
          </Alert>
          
          <p className="text-xs text-center text-muted-foreground">
            Sistem: {settings.platform_name} Management Tool
          </p>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 justify-center">
          <Button className="w-full" asChild>
            <Link href={`mailto:${settings.support_email}`}>
              Hubungi Admin ({settings.support_email})
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}