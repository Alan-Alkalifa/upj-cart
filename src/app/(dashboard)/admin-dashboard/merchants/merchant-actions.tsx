"use client"

import { useState, useTransition } from "react"
import { 
  approveMerchant, 
  rejectMerchant, 
  suspendMerchant, 
  restoreMerchant, 
  hardDeleteMerchant 
} from "../actions"
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

  // Helper component for the Delete Dialog to avoid repetition
  const DeleteDialog = ({ triggerLabel, triggerVariant = "destructive" }: { triggerLabel: string, triggerVariant?: "destructive" | "outline" }) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant={triggerVariant} className={triggerVariant === 'outline' ? "text-red-600 border-red-200 hover:bg-red-50" : ""}>
          <Trash2 className="mr-1 h-4 w-4" /> {triggerLabel}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Permanen?</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini tidak bisa dibatalkan. Semua data toko <b>{orgName}</b> beserta produknya akan dihapus selamanya.
            <br/><br/>
            Email notifikasi akan dikirim ke <b>{email}</b>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction 
            className="bg-red-600 hover:bg-red-700" 
            onClick={() => handleAction(() => hardDeleteMerchant(orgId, email), "Toko Berhasil Dihapus")}
          >
            {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Ya, Hapus Permanen"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  return (
    <div className="flex justify-end gap-2">
      {/* 1. PENDING: APPROVE & REJECT */}
      {status === 'pending' && (
        <>
          <Button 
            size="sm" variant="outline" className="text-green-600 hover:bg-green-50"
            onClick={() => handleAction(() => approveMerchant(orgId, email), "Toko Disetujui")}
            disabled={isPending}
          >
            <CheckCircle className="mr-1 h-4 w-4" /> Setuju
          </Button>

          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
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
            <Button size="sm" variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
              <AlertTriangle className="mr-1 h-4 w-4" /> Suspend
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Suspend Toko <b>{orgName}</b>?</AlertDialogTitle>
              <AlertDialogDescription>
                Toko tidak akan bisa diakses oleh publik sementara waktu. Email pemberitahuan akan dikirim ke pemilik.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction className="bg-amber-600 hover:bg-amber-700" onClick={() => handleAction(() => suspendMerchant(orgId, email), "Toko Ditangguhkan")}>
                Ya, Suspend
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* 3. SUSPENDED: RESTORE OR DELETE */}
      {status === 'suspended' && (
        <>
          {/* Action: Restore (Suspend -> Active) */}
          <Button 
            size="sm" 
            variant="outline" 
            className="text-green-600 border-green-200 hover:bg-green-50" 
            onClick={() => handleAction(() => restoreMerchant(orgId, email), "Toko Diaktifkan Kembali")}
            disabled={isPending}
          >
            <Play className="mr-1 h-4 w-4" /> Aktifkan
          </Button>

          {/* Action: Delete (Suspend -> Delete) */}
          <DeleteDialog triggerLabel="Hapus" triggerVariant="outline" />
        </>
      )}

      {/* 4. REJECTED: HARD DELETE */}
      {status === 'rejected' && (
        <DeleteDialog triggerLabel="Hapus Permanen" triggerVariant="destructive" />
      )}
    </div>
  )
}