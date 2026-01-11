"use client"

import { useState, useTransition } from "react"
import { refundOrder } from "./actions"
import { toast } from "sonner"
import { Undo2, Loader2 } from "lucide-react"
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

interface Props {
  order: any
}

export function OrderActions({ order }: Props) {
  const [isPending, startTransition] = useTransition()

  const handleRefund = () => {
    startTransition(async () => {
      const res = await refundOrder(order.id)
      if (res?.error) {
        toast.error("Gagal melakukan refund", { description: res.error })
      } else {
        toast.success("Order berhasil di-refund (Status: Cancelled)")
      }
    })
  }

  // Only show Refund button if order is 'completed'
  if (order.status !== 'completed') {
    return null
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700">
          <Undo2 className="mr-2 h-4 w-4" />
          Refund
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Konfirmasi Refund</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin melakukan refund untuk Order <b>#{order.id.slice(0,8)}</b>?
            <br/><br/>
            Status order akan diubah menjadi <b>Cancelled</b> dan dana akan dikembalikan ke pembeli (jika integrasi tersedia).
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleRefund} 
            disabled={isPending}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Ya, Proses Refund
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}