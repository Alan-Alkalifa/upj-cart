import { createClient } from "@/utils/supabase/server"
import { ProductForm } from "../product-form"
import { redirect } from "next/navigation"

export default async function CreateProductPage() {
  const supabase = await createClient()
  
  // 1. Cek User
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // 2. Ambil Org ID (Untuk dikirim ke Form & Filter Kategori)
  const { data: member } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("profile_id", user.id)
    .single()

  if (!member) redirect("/")

  // 3. Ambil Global Categories
  const { data: categories, error: catError } = await supabase
    .from("global_categories")
    .select("*")
    .order("name", { ascending: true })

  if (catError) {
    console.error("Error fetching global categories:", catError)
  }

  // 4. Ambil Merchant Categories (Filter by Org & Not Deleted)
  const { data: merchantCategories, error: merchCatError } = await supabase
    .from("merchant_categories")
    .select("*")
    .eq("org_id", member.org_id)
    .is("deleted_at", null) // Filter Soft Delete
    .order("name", { ascending: true })

  if (merchCatError) {
    console.error("Error fetching merchant categories:", merchCatError)
  }

  return (
    <ProductForm 
      categories={categories || []} 
      merchantCategories={merchantCategories || []}
      orgId={member.org_id} 
    />
  )
}