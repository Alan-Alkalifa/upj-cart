"use server"

import { createClient } from "@/utils/supabase/server"
import { updateResiSchema } from "@/lib/order-schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"


export async function updateOrderStatus(
  orderId: string, 
  newStatus: string, 
  trackingNumber?: string
) {
  const supabase = await createClient()
  
  // Prepare update object
  const updates: any = {
    status: newStatus,
    updated_at: new Date().toISOString(), // Assuming you have updated_at, if not remove this
  }

  // If status is shipped, we must have a tracking number
  if (newStatus === 'shipped' && trackingNumber) {
    updates.tracking_number = trackingNumber
  }

  const { error } = await supabase
    .from('orders')
    .update(updates)
    .eq('id', orderId)

  if (error) {
    console.error('Error updating order:', error)
    return { success: false, message: 'Failed to update order' }
  }

  // Refresh the page data
  revalidatePath('/merchant-dashboard/orders')
  return { success: true, message: 'Order updated successfully' }
}

// --- SHIP ORDER (Input Resi) ---
export async function shipOrder(orderId: string, values: z.infer<typeof updateResiSchema>) {
  const supabase = await createClient()

  // 1. Update Order Status
  // Note: We normally store the tracking number in a separate column or JSONB. 
  // Since our SQL schema didn't explicitly have 'tracking_number' column in 'orders', 
  // we will assume we add it OR store it in a note. 
  // *For this MVP, we will update the status to 'shipped' only.*
  // *If you want to save the actual number, you should add a column `tracking_number` to `orders` table.*
  
  const { error } = await supabase
    .from("orders")
    .update({ 
      status: 'shipped',
      // tracking_number: values.tracking_number // Uncomment if you add this column later
    })
    .eq("id", orderId)

  if (error) return { error: error.message }

  revalidatePath("/merchant/orders")
  return { success: true }
}

// --- COMPLETE ORDER ---
export async function completeOrder(orderId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("orders")
    .update({ status: 'completed' })
    .eq("id", orderId)

  if (error) return { error: error.message }

  revalidatePath("/merchant/orders")
  return { success: true }
}

// --- CANCEL ORDER ---
export async function cancelOrder(orderId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("orders")
    .update({ status: 'cancelled' })
    .eq("id", orderId)

  if (error) return { error: error.message }

  revalidatePath("/merchant/orders")
  return { success: true }
}