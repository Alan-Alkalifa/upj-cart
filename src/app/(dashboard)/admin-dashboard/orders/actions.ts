"use server"

import { createAdminClient } from "@/utils/supabase/admin"
import { revalidatePath } from "next/cache"

export async function refundOrder(orderId: string) {
  const supabase = createAdminClient()

  // Change status to 'cancelled' to represent a refund
  // Only applicable if current status is 'completed'
  const { error } = await supabase
    .from("orders")
    .update({ status: "cancelled" })
    .eq("id", orderId)
    .eq("status", "completed")

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/admin-dashboard/orders")
  return { success: true }
}