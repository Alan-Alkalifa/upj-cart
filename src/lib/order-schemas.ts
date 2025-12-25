import { z } from "zod"

export const updateResiSchema = z.object({
  tracking_number: z.string().min(3, "Nomor resi minimal 3 karakter"),
})