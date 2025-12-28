"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { replyReviewSchema } from "@/lib/marketing-schemas"
import { replyToReview } from "./actions"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { MessageCircle, Loader2 } from "lucide-react"

export function ReviewReplyButton({ reviewId, customerName, comment }: { reviewId: string, customerName: string, comment: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const form = useForm<z.infer<typeof replyReviewSchema>>({
    resolver: zodResolver(replyReviewSchema),
    defaultValues: { reply_comment: "" }
  })

  function onSubmit(values: z.infer<typeof replyReviewSchema>) {
    startTransition(async () => {
      const res = await replyToReview(reviewId, values)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Balasan terkirim")
        setIsOpen(false)
        form.reset()
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
           <MessageCircle className="mr-2 h-4 w-4" /> Balas
        </Button>
      </DialogTrigger>
      <DialogContent>
         <DialogHeader>
            <DialogTitle>Balas Ulasan {customerName}</DialogTitle>
         </DialogHeader>
         <div className="text-sm text-muted-foreground italic border-l-2 pl-2 mb-2 bg-muted/30 p-2 rounded">
            "{comment}"
         </div>
         <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
               <FormField control={form.control} name="reply_comment" render={({ field }) => (
                  <FormItem>
                     <FormControl>
                        <Textarea placeholder="Tulis balasan Anda (min. 3 karakter)..." {...field} />
                     </FormControl>
                     <FormMessage />
                  </FormItem>
               )} />
               <Button type="submit" disabled={isPending} className="w-full">
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kirim Balasan
               </Button>
            </form>
         </Form>
      </DialogContent>
    </Dialog>
  )
}