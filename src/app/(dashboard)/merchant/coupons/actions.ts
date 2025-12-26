"use server"

import { createClient } from "@/utils/supabase/server"
import { couponSchema } from "@/lib/marketing-schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function createCoupon(orgId: string, values: z.infer<typeof couponSchema>) {
  const supabase = await createClient()

  const { error } = await supabase.from("coupons").insert({
    org_id: orgId,
    code: values.code,
    discount_percent: values.discount_percent,
    max_uses: values.max_uses,
    expires_at: new Date(values.expires_at).toISOString(),
    is_active: true
  })

  if (error) {
    if (error.code === '23505') return { error: "Kode kupon sudah digunakan." }
    return { error: error.message }
  }

  revalidatePath("/merchant/coupons")
  return { success: true }
}

export async function deleteCoupon(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from("coupons").delete().eq("id", id)
  if (error) return { error: error.message }
  
  revalidatePath("/merchant/coupons")
  return { success: true }
}

export async function toggleCouponStatus(id: string, currentStatus: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("coupons")
    .update({ is_active: !currentStatus })
    .eq("id", id)
    
  if (error) return { error: error.message }
  revalidatePath("/merchant/coupons")
  return { success: true }
}