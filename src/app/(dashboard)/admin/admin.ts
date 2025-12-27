// app/(dashboard)/admin/actions.ts
'use server'

import { createClient } from '@/utils/supabase/server' // sesuaikan dengan path client Anda
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

export async function resetDatabase() {
  const supabase = await createClient()

  // 1. Cek otorisasi (Sangat Penting!)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'admin@email.com') { // Ganti dengan cek role yang sesuai
    throw new Error("Unauthorized")
  }

  // 2. Panggil fungsi RPC yang tadi dibuat
  const { error } = await supabase.rpc('truncate_all_tables')

  if (error) {
    console.error("Error resetting database:", error)
    return { success: false, message: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, message: "Database berhasil dikosongkan!" }
}


export async function emptyDatabase() {
  const supabase = createAdminClient()

  // Gunakan (supabase.rpc as any) untuk melewati validasi tipe TS yang kaku
  const { error } = await (supabase.rpc as any)('truncate_all_tables')

  if (error) {
    console.error("Error resetting database:", error)
    return { error: error.message }
  }

  // Revalidasi semua path agar data di UI langsung hilang
  revalidatePath("/", "layout")
  return { success: true }
}

export async function updatePlatformSettings(formData: {
  platform_name: string
  support_email: string
  transaction_fee_percent: number
  is_maintenance_mode: boolean
}) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("platform_settings")
    .upsert({
      id: 1, 
      ...formData,
      updated_at: new Date().toISOString()
    })

  if (error) return { error: error.message }

  revalidatePath("/admin/settings")
  return { success: true }
}