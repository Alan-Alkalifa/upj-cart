"use client"

import { useState, useTransition } from "react"
import { approveWithdrawal, rejectWithdrawal } from "../actions"
import { toast } from "sonner"
import { Loader2, CheckCircle, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Props {
  id: string
  amount: number
  merchantName: string
  bankInfo: string
}

export function PayoutActionButtons({ id, amount, merchantName, bankInfo }: Props) {
  const [isPending, startTransition] = useTransition()
  
  // States for Approve Dialog
  const [approveOpen, setApproveOpen] = useState(false)
  const [transferRef, setTransferRef] = useState("")

  // States for Reject Dialog
  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState("")

  const handleApprove = () => {
    startTransition(async () => {
      // We pass the Transfer Ref as the note
      const note = transferRef ? `Transfer Ref: ${transferRef}` : "Manual Transfer"
      const res = await approveWithdrawal(id, note)
      
      if (res?.error) {
        toast.error("Error", { description: res.error })
      } else {
        toast.success("Payout Approved", { description: "Merchant has been notified." })
        setApproveOpen(false)
      }
    })
  }

  const handleReject = () => {
    if(!rejectReason) return toast.error("Reason required")
      
    startTransition(async () => {
      const res = await rejectWithdrawal(id, rejectReason)
      
      if (res?.error) {
        toast.error("Error", { description: res.error })
      } else {
        toast.success("Payout Rejected")
        setRejectOpen(false)
      }
    })
  }

  return (
    <div className="flex justify-end gap-2">
      {/* REJECT BUTTON */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50">
            <XCircle className="h-4 w-4 mr-1" /> Reject
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Request?</DialogTitle>
            <DialogDescription>
              Why are you rejecting this request for <span className="font-bold text-foreground">Rp {amount.toLocaleString("id-ID")}</span>?
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid gap-2">
               <Label htmlFor="reject-reason">Reason</Label>
               <Input 
                  id="reject-reason"
                  placeholder="e.g. Invalid bank details"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
               />
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setRejectOpen(false)}>Cancel</Button>
             <Button variant="destructive" onClick={handleReject} disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Reject
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* APPROVE BUTTON */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="bg-green-600 hover:bg-green-700">
            <CheckCircle className="h-4 w-4 mr-1" /> Approve
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Mark as Transferred</DialogTitle>
            <DialogDescription>
              Have you manually transferred <span className="font-bold text-foreground">Rp {amount.toLocaleString("id-ID")}</span> to:<br/>
              <span className="font-mono text-xs bg-muted p-1 rounded mt-2 block break-all">
                {bankInfo}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid gap-2">
                <Label htmlFor="transfer-ref">Transfer Reference ID (Optional)</Label>
                <Input 
                    id="transfer-ref"
                    placeholder="e.g. TRX-998877"
                    value={transferRef}
                    onChange={(e) => setTransferRef(e.target.value)}
                />
             </div>
          </div>
          <DialogFooter>
             <Button variant="ghost" onClick={() => setApproveOpen(false)}>Cancel</Button>
             <Button onClick={handleApprove} disabled={isPending} className="bg-green-600 hover:bg-green-700">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm Transfer
             </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}