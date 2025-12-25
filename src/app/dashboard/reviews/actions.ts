"use server"

import { createClient } from "@/utils/supabase/server"
import { replyReviewSchema } from "@/lib/marketing-schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function replyToReview(reviewId: string, values: z.infer<typeof replyReviewSchema>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("reviews")
    .update({
      reply_comment: values.reply_comment,
      replied_at: new Date().toISOString()
    })
    .eq("id", reviewId)

  if (error) return { error: error.message }
  
  revalidatePath("/dashboard/reviews")
  return { success: true }
}