import { z } from "zod"

export const couponSchema = z.object({
  code: z.string().min(1, "Kode kupon harus diisi").toUpperCase(),
  discount_percent: z.number().min(1).max(100),
  max_uses: z.number().int().positive().default(100),
  expires_at: z.string().min(1, "Tanggal kadaluarsa harus diisi"),
})

export const replyReviewSchema = z.object({
  reply_comment: z.string().min(3, "Balasan minimal 3 karakter"),
})