"use server"

import { createClient } from "@/utils/supabase/server"
import { createAdminClient } from "@/utils/supabase/admin" // Pastikan Anda punya file ini
import { revalidatePath } from "next/cache"


export async function addStaffMember(orgId: string, email: string) {
  const supabase = await createClient()

  // 1. Check if user exists in profiles
  const { data: userProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single()

  if (!userProfile) {
    return { error: "User dengan email tersebut belum terdaftar di aplikasi ini." }
  }

  // 2. Check if already a member
  const { data: existingMember } = await supabase
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("profile_id", userProfile.id)
    .single()

  if (existingMember) {
    return { error: "User tersebut sudah menjadi staff." }
  }

  // 3. Add to Organization
  const { error } = await supabase.from("organization_members").insert({
    org_id: orgId,
    profile_id: userProfile.id,
    role: "staff" // Default role
  })

  if (error) return { error: error.message }

  revalidatePath("/dashboard/settings")
  return { success: true }
}


export async function removeStaffMember(memberId: string) {
  const supabase = await createClient()
  
  // 1. Cek User Login
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Unauthorized" }

  console.log("--- DEBUG REMOVE STAFF ---")
  console.log("Actor ID:", user.id)
  console.log("Target Member ID:", memberId)

  // 2. Ambil Info Org dari Member yang mau dihapus
  // Kita pakai supabase biasa (kena RLS read policy yang sudah kita fix sebelumnya)
  const { data: targetMember, error: fetchError } = await supabase
    .from("organization_members")
    .select("org_id, profile_id")
    .eq("id", memberId)
    .single()

  if (fetchError || !targetMember) {
    console.error("Fetch Error:", fetchError)
    return { error: "Member tidak ditemukan atau Anda tidak memiliki akses melihatnya." }
  }

  // 3. Safety: Jangan hapus diri sendiri
  if (targetMember.profile_id === user.id) {
    return { error: "Anda tidak dapat menghapus diri sendiri." }
  }

  // 4. CEK OTORITAS (MANUAL CHECK)
  // Apakah SAYA adalah Owner/Admin di Org tersebut?
  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("org_id", targetMember.org_id)
    .eq("profile_id", user.id)
    .single()

  const isAuthorized = myMembership?.role === 'owner' || myMembership?.role === 'admin'
  console.log("My Role:", myMembership?.role)
  console.log("Is Authorized:", isAuthorized)

  if (!isAuthorized) {
    return { error: "Anda tidak memiliki izin (Hanya Owner/Admin)." }
  }

  // 5. EKSEKUSI HAPUS MENGGUNAKAN ADMIN CLIENT (BYPASS RLS)
  // Ini solusi pamungkas untuk masalah Recursion saat Delete
  const supabaseAdmin = createAdminClient()
  
  const { error: deleteError } = await supabaseAdmin
    .from("organization_members")
    .delete()
    .eq("id", memberId)

  if (deleteError) {
    console.error("Delete Error:", deleteError)
    return { error: deleteError.message }
  }

  console.log("Success Delete")
  revalidatePath("/dashboard/settings")
  return { success: true }
}