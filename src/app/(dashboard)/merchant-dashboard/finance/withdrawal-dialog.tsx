"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { withdrawalSchema } from "@/lib/finance-schemas"
import { requestWithdrawal } from "./actions"
import { toast } from "sonner"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Loader2, Wallet } from "lucide-react"

// Use z.input to get the input type (before coercion)
type WithdrawalFormInput = z.input<typeof withdrawalSchema>
// Use z.output to get the output type (after coercion)
type WithdrawalFormOutput = z.output<typeof withdrawalSchema>

interface WithdrawalDialogProps {
  org: any
  maxBalance: number
}

export function WithdrawalDialog({ org, maxBalance }: WithdrawalDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Use the input type for the form
  const form = useForm<WithdrawalFormInput>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      amount: 0,
      bank_name: org.bank_name || "",
      account_number: org.bank_account_number || "",
      account_holder: org.bank_account_holder || "",
    }
  })

  // Check if bank info is set
  const hasBankInfo = org.bank_name && org.bank_account_number

  // onSubmit receives input type, then we parse to get output type
  function onSubmit(values: WithdrawalFormInput) {
    // Parse to ensure coercion happens and we get the output type
    const validated = withdrawalSchema.parse(values) as WithdrawalFormOutput
    
    if (validated.amount > maxBalance) {
      form.setError("amount", { message: "Saldo tidak mencukupi" })
      return
    }

    startTransition(async () => {
      const res = await requestWithdrawal(org.id, validated)
      if (res?.error) {
        toast.error("Gagal", { description: res.error })
      } else {
        toast.success("Permintaan penarikan dikirim!")
        setIsOpen(false)
        form.reset()
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button disabled={maxBalance < 0 || !hasBankInfo}>
          <Wallet className="mr-2 h-4 w-4" /> Tarik Dana
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tarik Dana Penghasilan</DialogTitle>
          <DialogDescription>
              Dana akan ditransfer ke rekening terdaftar. Minimal Rp 50.000.
          </DialogDescription>
        </DialogHeader>

        {!hasBankInfo ? (
           <div className="text-red-500 text-sm p-4 bg-red-50 rounded-md">
             Anda belum mengatur informasi rekening bank. Silakan atur di menu <b>Pengaturan</b>.
           </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              
              <div className="p-3 bg-muted rounded-md text-sm space-y-1">
                <div className="font-semibold text-muted-foreground">Rekening Tujuan:</div>
                <div>{org.bank_name} - {org.bank_account_number}</div>
                <div>a.n {org.bank_account_holder}</div>
              </div>

              <FormField 
                control={form.control} 
                name="amount" 
                render={({ field }) => {
                  const { value, onChange, ...restField } = field;
                  return (
                    <FormItem>
                      <FormLabel>Nominal Penarikan</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Min 50.000" 
                          value={value as number}
                          onChange={(e) => onChange(parseFloat(e.target.value))}
                          {...restField}
                        />
                      </FormControl>
                      <FormDescription>
                        Saldo Tersedia: <b>Rp {maxBalance.toLocaleString("id-ID")}</b>
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }} 
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Konfirmasi Penarikan
              </Button>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}