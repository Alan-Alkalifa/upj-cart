import { z } from "zod"

export const withdrawalSchema = z.object({
  amount: z.coerce.number().min(50000, "Minimal penarikan Rp 50.000"),
  bank_name: z.string().min(1, "Nama Bank wajib"),
  account_number: z.string().min(1, "No. Rekening wajib"),
  account_holder: z.string().min(1, "Atas Nama wajib"),
})