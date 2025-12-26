"use client"

import { useState, useTransition } from "react"
import { approveMerchant, rejectMerchant } from "../actions"
import { toast } from "sonner"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"
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
}

export function MerchantActionButtons({ orgId, email, orgName }: Props) {
  const [isPending, startTransition] = useTransition()
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleApprove = () => {
    startTransition(async () => {
      const res = await approveMerchant(orgId, email)
      if (res?.error) {
        toast.error("Gagal", { description: res.error })
      } else {
        toast.success("Toko Disetujui", { description: `${orgName} kini aktif.` })
      }
    })
  }

  const handleReject = () => {
    if (!rejectReason) {
      toast.error("Wajib isi alasan penolakan")
      return
    }
    startTransition(async () => {
      const res = await rejectMerchant(orgId, email, rejectReason)
      if (res?.error) {
        toast.error("Gagal", { description: res.error })
      } else {
        toast.success("Toko Ditolak")
        setRejectOpen(false)
      }
    })
  }

  return (
    <div className="flex justify-end gap-2">
      {/* APPROVE BUTTON (Alert Dialog) */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700 hover:bg-green-50">
            <CheckCircle className="mr-1 h-4 w-4" /> Setuju
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Setujui Toko ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Toko <b>{orgName}</b> akan menjadi aktif. Pemilik akan menerima email notifikasi dan bisa mulai berjualan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Aktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* REJECT BUTTON (Custom Dialog with Input) */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <XCircle className="mr-1 h-4 w-4" /> Tolak
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak Pengajuan Toko</DialogTitle>
            <DialogDescription>
              Toko <b>{orgName}</b> akan ditolak permanen. Berikan alasan kepada merchant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Alasan Penolakan</Label>
              <Input
                id="reason"
                placeholder="Contoh: Nama toko tidak pantas..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>Batal</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isPending}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tolak Pengajuan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}