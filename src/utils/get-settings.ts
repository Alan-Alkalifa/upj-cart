import { createClient } from "@/utils/supabase/server"

export async function getPlatformSettings() {
  const supabase = await createClient()
  
  const { data } = await supabase
    .from("platform_settings")
    .select("*")
    .single()
    
  // Return default values jika DB kosong/error (Safety fallback)
  return data || {
    platform_name: "UPJ Cart",
    support_email: "admin@upj.ac.id",
    transaction_fee_percent: 0,
    is_maintenance_mode: false
  }
}