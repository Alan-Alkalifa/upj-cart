import { z } from "zod"


// Withdrawal Schema
export const withdrawalSchema = z.object({
  amount: z.coerce.number().min(50000, "Minimum withdrawal is Rp 50,000"),
  bank_name: z.string().min(1, "Bank Name is required"),
  account_number: z.string().min(1, "Account Number is required"),
  account_holder: z.string().min(1, "Account Holder Name is required"),
});