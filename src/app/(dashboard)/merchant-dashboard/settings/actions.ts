"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin" // PERBAIKAN: Import Admin Client
import { organizationSchema } from "@/lib/dashboard-schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function updateOrganization(orgId: string, values: z.infer<typeof organizationSchema>) {
  const supabase = await createClient()

  // 1. Verifikasi User Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  // 2. Authorization Manual (Cek apakah user adalah anggota toko)
  const { data: member } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("profile_id", user.id)
    .single()

  if (!member) {
    return { error: "Akses ditolak. Anda bukan anggota toko ini." }
  }

  // 3. Update Menggunakan Admin Client (Bypass RLS)
  // Ini memastikan data tersimpan meskipun RLS database memblokir update user biasa
  const supabaseAdmin = createAdminClient()

  const { error } = await supabaseAdmin
    .from("organizations")
    .update({
      name: values.name,
      description: values.description,
      logo_url: values.logo_url,
      banner_url: values.banner_url,
      
      website_url: values.website_url,
      instagram_url: values.instagram_url,
      tiktok_url: values.tiktok_url,

      address_street: values.address_street,
      address_district: values.address_district,
      address_city: values.address_city,
      address_postal_code: values.address_postal_code,

      bank_name: values.bank_name,
      bank_account_number: values.bank_account_number,
      bank_account_holder: values.bank_account_holder,
      
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId)

  if (error) {
    console.error("Gagal update toko:", error)
    return { error: "Database error: " + error.message }
  }

  revalidatePath("/merchant-dashboard/settings")
  revalidatePath("/merchant-dashboard", "layout") 

  return { success: true }
}