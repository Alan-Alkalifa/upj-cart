"use client"

import { useState, useTransition } from "react"
import { deleteCoupon, toggleCouponStatus } from "./actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Trash2, Loader2 } from "lucide-react"
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

interface CouponActionsProps {
  id: string
  code: string
  isActive: boolean
}

export function CouponActions({ id, code, isActive }: CouponActionsProps) {
  const [isPending, startTransition] = useTransition()

  function onToggle(status: boolean) {
    startTransition(async () => {
      const res = await toggleCouponStatus(id, status)
      if (res?.error) toast.error(res.error)
      else toast.success("Status diperbarui")
    })
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deleteCoupon(id)
      if (res?.error) toast.error(res.error)
      else toast.success("Kupon dihapus")
    })
  }

  return (
    <div className="flex items-center justify-end gap-3">
      <div className="flex items-center gap-2">
         <Switch
            checked={isActive}
            onCheckedChange={() => onToggle(isActive)}
            disabled={isPending}
            className="data-[state=checked]:bg-green-600"
         />
         <span className="text-xs text-muted-foreground w-12">
            {isActive ? "Aktif" : "Nonaktif"}
         </span>
      </div>
      
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" disabled={isPending} className="h-8 w-8 text-muted-foreground hover:text-destructive">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kupon?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini permanen. Kupon <b>{code}</b> akan dihapus dan tidak dapat dipulihkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}