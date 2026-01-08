import { createAdminClient } from "@/utils/supabase/admin"
import { Separator } from "@/components/ui/separator"
import { SettingsForm } from "./settings-form"

export default async function AdminSettingsPage() {
  const supabase = createAdminClient()

  // Fetch Data Settings (Single Row)
  const { data: settings } = await supabase
    .from("platform_settings")
    .select("*")
    .single()

  // Default values jika database kosong (fallback)
  const initialData = settings || {
    platform_name: "Bemlanja",
    support_email: "admin@example.com",
    transaction_fee_percent: 0,
    is_maintenance_mode: false
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Platform</h1>
        <p className="text-muted-foreground text-sm">
          Konfigurasi global untuk marketplace. Perubahan di sini berdampak pada seluruh sistem.
        </p>
      </div>
      <Separator />
      
      {/* Form Component (Client Side) */}
      <SettingsForm initialData={initialData} />
    </div>
  )
}