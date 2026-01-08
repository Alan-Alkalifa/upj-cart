"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin"
import { organizationSchema } from "@/lib/dashboard-schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { getProvinces, getCities, getDistricts, getSubdistricts } from "@/lib/rajaongkir"

// --- LOCATION DATA FETCHING ---
// Consistent with checkout/actions.ts
export async function getLocationData(type: 'province' | 'city' | 'district' | 'subdistrict', parentId?: string) {
  try {
    switch (type) {
      case 'province':
        return await getProvinces();
      case 'city':
        return parentId ? await getCities(parentId) : [];
      case 'district':
        return parentId ? await getDistricts(parentId) : [];
      case 'subdistrict':
        return parentId ? await getSubdistricts(parentId) : [];
      default:
        return [];
    }
  } catch (error) {
    console.error(`Error fetching ${type}:`, error);
    return [];
  }
}

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
      
      // Update Origin Data for Shipping
      origin_district_id: values.origin_district_id,
      origin_district_name: values.origin_district_name,

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