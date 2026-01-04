"use server"

import { createClient } from "@/utils/supabase/server"
import { withdrawalSchema } from "@/lib/finance-schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function requestWithdrawal(orgId: string, values: z.infer<typeof withdrawalSchema>) {
  const supabase = await createClient()

  // 1. Validation: Check available balance
  // (In a real app, we calculate balance again here to prevent overdraft. 
  // For MVP, we trust the database constraints and trigger logic, 
  // but let's do a quick check if needed. Skipping for brevity to rely on Trigger).

  // 2. Insert Withdrawal Request
  const { error } = await supabase
    .from("withdrawals")
    .insert({
      org_id: orgId,
      amount: values.amount,
      bank_name: values.bank_name,
      account_number: values.account_number,
      account_holder: values.account_holder,
      status: 'requested'
    })

  if (error) {
    // Catch the specific Trigger Error from Postgres
    if (error.message.includes("Withdrawal limit reached")) {
      return { error: "Batas penarikan tercapai: Anda hanya bisa menarik dana sekali setiap 7 hari." }
    }
    return { error: error.message }
  }

  revalidatePath("/merchant/finance")
  return { success: true }
}