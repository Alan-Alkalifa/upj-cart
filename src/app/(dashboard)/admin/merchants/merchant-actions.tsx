"use client"

import { useState, useTransition } from "react"
import { approveMerchant, rejectMerchant, suspendMerchant, hardDeleteMerchant } from "../actions"
import { toast } from "sonner"
import { CheckCircle, XCircle, Loader2, AlertTriangle, Trash2, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  orgId: string
  email: string
  orgName: string
  status: "pending" | "active" | "suspended" | "rejected"
}

export function MerchantActionButtons({ orgId, email, orgName, status }: Props) {
  const [isPending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleAction = (actionFn: () => Promise<{ error?: string }>, successMsg: string) => {
    startTransition(async () => {
      const res = await actionFn()
      if (res?.error) {
        toast.error("Gagal", { description: res.error })
      } else {
        toast.success(successMsg)
        setRejectOpen(false)
      }
    })
  }

  return (
    <div className="flex justify-end gap-2">
      {/* 1. PENDING: APPROVE & REJECT */}
      {status === 'pending' && (
        <>
          <Button 
            size="sm" variant="outline" className="text-green-600"
            onClick={() => handleAction(() => approveMerchant(orgId, email), "Toko Disetujui")}
            disabled={isPending}
          >
            <CheckCircle className="mr-1 h-4 w-4" /> Setuju
          </Button>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-red-600">
                <XCircle className="mr-1 h-4 w-4" /> Tolak
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tolak Pengajuan</DialogTitle>
                <DialogDescription>Alasan penolakan untuk <b>{orgName}</b>.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Alasan</Label>
                <Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Contoh: Nama toko tidak valid" />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setRejectOpen(false)}>Batal</Button>
                <Button variant="destructive" disabled={!rejectReason || isPending} onClick={() => handleAction(() => rejectMerchant(orgId, email, rejectReason), "Toko Ditolak")}>
                  {isPending ? <Loader2 className="animate-spin" /> : "Konfirmasi Tolak"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* 2. ACTIVE: SUSPEND */}
      {status === 'active' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="text-amber-600 border-amber-200">
              <AlertTriangle className="mr-1 h-4 w-4" /> Suspend
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend Toko <b>{orgName}</b>?</AlertDialogTitle>
              <AlertDialogDescription>Toko tidak akan bisa diakses oleh publik sementara waktu.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction className="bg-amber-600" onClick={() => handleAction(() => suspendMerchant(orgId, email), "Toko Ditangguhkan")}>
                Ya, Suspend
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* 3. SUSPENDED: RESTORE TO ACTIVE */}
      {status === 'suspended' && (
        <Button size="sm" variant="outline" className="text-green-600" onClick={() => handleAction(() => approveMerchant(orgId, email), "Toko Diaktifkan Kembali")}>
          <Play className="mr-1 h-4 w-4" /> Aktifkan Kembali
        </Button>
      )}

      {/* 4. REJECTED: HARD DELETE */}
      {status === 'rejected' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="destructive">
              <Trash2 className="mr-1 h-4 w-4" /> Hapus Permanen
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Permanen?</AlertDialogTitle>
              <AlertDialogDescription>Semua data <b>{orgName}</b> akan dihapus selamanya.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600" onClick={() => handleAction(() => hardDeleteMerchant(orgId), "Toko Berhasil Dihapus")}>
                Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  )
}