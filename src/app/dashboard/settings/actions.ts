"use server"

import { createClient } from "@/utils/supabase/server"
import { organizationSchema } from "@/lib/dashboard-schemas"
import { revalidatePath } from "next/cache"
import { z } from "zod"

export async function updateOrganization(orgId: string, values: z.infer<typeof organizationSchema>) {
  const supabase = await createClient()

  const { error } = await supabase
    .from("organizations")
    .update({
      name: values.name,
      description: values.description,
      logo_url: values.logo_url,
      banner_url: values.banner_url,
      
      // Socials
      website_url: values.website_url,
      instagram_url: values.instagram_url,
      tiktok_url: values.tiktok_url,

      // Address
      address_street: values.address_street,
      address_district: values.address_district,
      address_city: values.address_city,
      address_postal_code: values.address_postal_code,

      // Bank
      bank_name: values.bank_name,
      bank_account_number: values.bank_account_number,
      bank_account_holder: values.bank_account_holder,
      
      updated_at: new Date().toISOString(),
    })
    .eq("id", orgId)

  if (error) return { error: error.message }

  revalidatePath("/dashboard/settings")
  // Also revalidate the sidebar/layout to update name/logo immediately if changed
  revalidatePath("/dashboard", "layout") 
  
  return { success: true }
}