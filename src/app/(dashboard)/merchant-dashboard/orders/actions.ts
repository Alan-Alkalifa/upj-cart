// src/app/(dashboard)/merchant-dashboard/orders/actions.ts
"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"

export async function updateOrderStatus(
  orderId: string, 
  newStatus: string, 
  trackingNumber?: string
) {
  const supabase = await createClient()

  // 1. Validate User Permission (Must be part of the org)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Unauthorized" }

  // 2. Prepare Update Data
  const updateData: any = { status: newStatus }
  
  // If moving to 'shipped', require tracking number
  if (newStatus === 'shipped') {
    if (!trackingNumber) return { success: false, message: "Nomor resi wajib diisi." }
    updateData.tracking_number = trackingNumber
  }

  // 3. Perform Update
  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
  
  if (error) {
    console.error("Update Order Error:", error)
    return { success: false, message: "Gagal memperbarui pesanan." }
  }

  // 4. Revalidate Page
  revalidatePath("/merchant-dashboard/orders")
  return { success: true, message: "Status pesanan diperbarui." }
}