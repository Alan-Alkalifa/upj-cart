"use client"

import { useState, useTransition } from "react"
import { deleteProduct, restoreProduct } from "../actions" // Import restoreProduct
import { toast } from "sonner"
import { Trash2, Loader2, RotateCcw } from "lucide-react" // Import icon RotateCcw
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Props {
  productId: string
  productName: string
  isDeleted?: boolean // Tambahkan props ini
}

export function AdminProductActions({ productId, productName, isDeleted = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [openDelete, setOpenDelete] = useState(false)
  const [openRestore, setOpenRestore] = useState(false)

  const handleDelete = () => {
    startTransition(async () => {
      const res = await deleteProduct(productId)
      if (res?.error) {
        toast.error("Gagal menghapus", { description: res.error })
      } else {
        toast.success("Produk Dihapus", { description: `${productName} dipindahkan ke sampah.` })
        setOpenDelete(false)
      }
    })
  }

  const handleRestore = () => {
    startTransition(async () => {
      const res = await restoreProduct(productId)
      if (res?.error) {
        toast.error("Gagal memulihkan", { description: res.error })
      } else {
        toast.success("Produk Dipulihkan", { description: `${productName} kembali aktif.` })
        setOpenRestore(false)
      }
    })
  }

  // --- JIKA PRODUK SUDAH DIHAPUS (TAMPILKAN TOMBOL RESTORE) ---
  if (isDeleted) {
    return (
      <AlertDialog open={openRestore} onOpenChange={setOpenRestore}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertDialogTrigger asChild>
                <Button size="icon" variant="ghost" className="text-green-600 hover:text-green-700 hover:bg-green-50">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
            </TooltipTrigger>
            <TooltipContent>Pulihkan Produk</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pulihkan {productName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Produk ini akan kembali muncul di etalase toko dan bisa dibeli oleh pengguna.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestore} 
              disabled={isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Pulihkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // --- JIKA PRODUK AKTIF (TAMPILKAN TOMBOL DELETE) ---
  return (
    <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
          </TooltipTrigger>
          <TooltipContent>Hapus Produk</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {productName}?</AlertDialogTitle>
          <AlertDialogDescription>
            Produk ini akan dipindahkan ke sampah (Soft Delete). Anda masih bisa memulihkannya nanti.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete} 
            disabled={isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Hapus Produk"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}