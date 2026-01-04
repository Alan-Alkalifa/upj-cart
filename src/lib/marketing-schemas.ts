import { z } from "zod"

export const couponSchema = z.object({
  code: z.string().min(1, "Coupon code is required").toUpperCase(),
  discount_percent: z.number().min(1).max(100),
  max_uses: z.number().int().positive().default(100),
  expires_at: z.string().min(1, "Expiration date is required"),
})

export const replyReviewSchema = z.object({
  reply_comment: z.string().min(3, "Reply must be at least 3 characters long"),
})