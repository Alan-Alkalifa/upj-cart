import { createClient } from "@/utils/supabase/server"
import { ProductForm } from "../product-form"
import { redirect } from "next/navigation"

export default async function CreateProductPage() {
  const supabase = await createClient()
  
  // 1. Cek User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 2. Ambil Org ID (Untuk dikirim ke Form)
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("profile_id", user.id)
    .single()

  if (!member) redirect("/")

  // 3. Ambil Kategori (Sekarang seharusnya berhasil setelah SQL fix)
  const { data: categories, error } = await supabase
    .from("global_categories")
    .select("*")
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching categories:", error)
  }

  return (
    <ProductForm 
      categories={categories || []} 
      orgId={member.org_id} 
    />
  )
}