import { z } from "zod"

export const updateResiSchema = z.object({
  tracking_number: z.string().min(3, "Tracking number must be at least 3 characters"),
})