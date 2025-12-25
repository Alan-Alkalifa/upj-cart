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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Star, MessageCircle, Reply } from "lucide-react"

export function ReviewClient({ reviews }: { reviews: any[] }) {
  const [selectedReview, setSelectedReview] = useState<any>(null)
  const [isPending, startTransition] = useTransition()

  const form = useForm<z.infer<typeof replyReviewSchema>>({
    resolver: zodResolver(replyReviewSchema),
    defaultValues: { reply_comment: "" }
  })

  function openReply(review: any) {
    setSelectedReview(review)
    form.setValue("reply_comment", review.reply_comment || "")
  }

  function onSubmit(values: z.infer<typeof replyReviewSchema>) {
    if (!selectedReview) return
    startTransition(async () => {
      const res = await replyToReview(selectedReview.id, values)
      if (res?.error) toast.error(res.error)
      else {
        toast.success("Balasan terkirim")
        setSelectedReview(null)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ulasan Pembeli</h2>
        <p className="text-muted-foreground">Kelola feedback dan reputasi toko Anda.</p>
      </div>

      <div className="grid gap-4">
        {reviews.length === 0 && (
          <div className="p-8 text-center border rounded-md text-muted-foreground">Belum ada ulasan.</div>
        )}
        
        {reviews.map((r) => (
          <Card key={r.id}>
            <CardHeader className="flex flex-row gap-4 space-y-0 pb-2">
              <Avatar>
                 <AvatarImage src={r.profiles?.avatar_url} />
                 <AvatarFallback>{r.profiles?.full_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                 <div className="flex justify-between items-start">
                    <div>
                       <h4 className="font-semibold text-sm">{r.profiles?.full_name}</h4>
                       <p className="text-xs text-muted-foreground">Order #{r.orders?.id.slice(0,8)} • {new Date(r.created_at).toLocaleDateString("id-ID")}</p>
                    </div>
                    <div className="flex text-yellow-500">
                       {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`h-4 w-4 ${i < r.rating ? "fill-current" : "text-muted/30"}`} />
                       ))}
                    </div>
                 </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-4">
              <div className="bg-muted/30 p-3 rounded-md text-sm">
                 <div className="font-medium text-xs text-muted-foreground mb-1">Produk: {r.products?.name}</div>
                 <p>{r.comment || "Tidak ada komentar."}</p>
                 {r.image_url && (
                    <img src={r.image_url} alt="Review" className="mt-2 h-20 w-20 object-cover rounded-md border" />
                 )}
              </div>

              {/* Reply Section */}
              {r.reply_comment ? (
                 <div className="ml-8 pl-4 border-l-2 border-primary/20 space-y-1">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                       <Reply className="h-3 w-3" /> Balasan Toko
                    </div>
                    <p className="text-sm text-muted-foreground">{r.reply_comment}</p>
                 </div>
              ) : (
                 <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => openReply(r)}>
                       <MessageCircle className="mr-2 h-4 w-4" /> Balas
                    </Button>
                 </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Reply Dialog */}
      <Dialog open={!!selectedReview} onOpenChange={(open) => !open && setSelectedReview(null)}>
        <DialogContent>
           <DialogHeader><DialogTitle>Balas Ulasan</DialogTitle></DialogHeader>
           <div className="text-sm text-muted-foreground italic border-l-2 pl-2 mb-4">
              "{selectedReview?.comment}"
           </div>
           <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField control={form.control} name="reply_comment" render={({ field }) => (
                    <FormItem>
                       <FormControl><Textarea placeholder="Tulis balasan Anda..." {...field} /></FormControl>
                       <FormMessage />
                    </FormItem>
                 )} />
                 <Button type="submit" disabled={isPending}>Kirim Balasan</Button>
              </form>
           </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}