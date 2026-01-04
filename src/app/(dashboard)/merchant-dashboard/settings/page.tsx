import { createClient } from "@/utils/supabase/server"
import { SettingsForm } from "./settings-form"
import { StaffList } from "./staff-list"
import { redirect } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // 1. Ambil Data Member & Organisasi
  const { data: member } = await supabase
    .from("organization_members")
    .select("role, org_id, organizations(*)")
    .eq("profile_id", user.id)
    .single()

  if (!member) redirect("/")

  // Normalisasi data organisasi (Jaga-jaga jika return array)
  const orgData = Array.isArray(member.organizations) 
    ? member.organizations[0] 
    : member.organizations

  // Validasi jika data org tidak ada
  if (!orgData) return <div>Data toko tidak ditemukan.</div>

  // 2. Ambil Staff List
  const { data: staffMembers } = await supabase
    .from("organization_members")
    .select(`
      id,
      role,
      profiles ( id, full_name, email, avatar_url )
    `)
    .eq("org_id", member.org_id)
    .order("created_at", { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pengaturan Toko</h2>
        <p className="text-muted-foreground">Kelola profil toko, alamat, dan akses staff.</p>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">Informasi Umum</TabsTrigger>
          <TabsTrigger value="staff">Staff & Akses</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          {/* PERBAIKAN: Kirim orgId secara eksplisit */}
          <SettingsForm initialData={orgData} orgId={member.org_id} />
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
           <StaffList 
             members={staffMembers || []} 
             orgId={member.org_id} 
             currentUserId={user.id}
             currentUserRole={member.role} 
           />
        </TabsContent>
      </Tabs>
    </div>
  )
}