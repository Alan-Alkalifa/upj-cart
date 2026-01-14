"use server"

import { createAdminClient } from "@/utils/supabase/admin"
import { getPlatformSettings } from "@/utils/get-settings"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

// --- APPROVE (Pending -> Active) ---
export async function approveMerchant(orgId: string, merchantEmail: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("organizations")
    .update({ 
      status: "active",
      rejection_reason: null
    })
    .eq("id", orgId)

  if (error) return { error: error.message }

  try {
    await resend.emails.send({
      from: 'Bemlanja <support@bemlanja.com>',
      to: merchantEmail, 
      subject: 'Status Toko: Aktif',
      html: `<h1>Toko Anda Kini Aktif</h1><p>Selamat! Toko Anda telah diaktifkan kembali oleh Admin.</p>`
    })
  } catch (e) {
    console.error("Email failed:", e)
  }

  revalidatePath("/admin-dashboard/merchants")
  return { success: true }
}

// --- RESTORE (Suspended -> Active) ---
export async function restoreMerchant(orgId: string, merchantEmail: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("organizations")
    .update({ 
      status: "active",
      rejection_reason: null
    })
    .eq("id", orgId)

  if (error) return { error: error.message }

  try {
    await resend.emails.send({
      from: 'Bemlanja Support <support@bemlanja.com>',
      to: merchantEmail, 
      subject: 'Toko Diaktifkan Kembali',
      html: `
        <h1>Status Toko Pulih</h1>
        <p>Halo,</p>
        <p>Toko Anda yang sebelumnya ditangguhkan (suspend) kini telah <b>diaktifkan kembali</b>.</p>
        <p>Mohon patuhi kebijakan kami agar tidak terjadi penangguhan di masa mendatang.</p>
      `
    })
  } catch (e) {
    console.error("Email failed:", e)
  }

  revalidatePath("/admin-dashboard/merchants")
  return { success: true }
}

// --- REJECT (Pending -> Rejected) ---
export async function rejectMerchant(orgId: string, merchantEmail: string, reason: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("organizations")
    .update({ 
      status: "rejected",
      rejection_reason: reason 
    })
    .eq("id", orgId)

  if (error) return { error: error.message }

  try {
    await resend.emails.send({
      from: 'Bemlanja <support@bemlanja.com>',
      to: merchantEmail,
      subject: 'Status Pendaftaran Toko',
      html: `<h1>Pengajuan Ditolak</h1><p>Alasan: ${reason}</p>`
    })
  } catch (e) {
    console.error("Email failed:", e)
  }

  revalidatePath("/admin-dashboard/merchants")
  return { success: true }
}

// --- SUSPEND (Active -> Suspended) ---
export async function suspendMerchant(orgId: string, merchantEmail: string) {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from("organizations")
    .update({ status: "suspended" })
    .eq("id", orgId)

  if (error) return { error: error.message }

  try {
    await resend.emails.send({
      from: 'Bemlanja Support <support@bemlanja.com>',
      to: merchantEmail,
      subject: 'PENTING: Toko Ditangguhkan',
      html: `<h1>Toko Ditangguhkan</h1><p>Toko Anda sementara dinonaktifkan oleh admin karena pelanggaran kebijakan.</p>`
    })
  } catch (e) {
    console.error("Email failed:", e)
  }

  revalidatePath("/admin-dashboard/merchants")
  return { success: true }
}

// --- HARD DELETE (Rejected/Suspended -> Deleted) ---
export async function hardDeleteMerchant(orgId: string, merchantEmail?: string) {
  const supabase = createAdminClient()

  // Send notification before deletion if email is provided
  if (merchantEmail) {
    try {
      await resend.emails.send({
        from: 'Bemlanja Admin <support@bemlanja.com>',
        to: merchantEmail,
        subject: 'Pemberitahuan Penghapusan Akun Toko',
        html: `
          <h1 style="color: #dc2626;">Toko Dihapus Permanen</h1>
          <p>Halo,</p>
          <p>Akun toko Anda telah <b>dihapus secara permanen</b> dari platform kami oleh Administrator.</p>
          <p>Seluruh data produk dan riwayat toko tidak dapat dikembalikan.</p>
        `
      })
    } catch (e) {
      console.error("Email failed:", e)
    }
  }

  // Ensure database has ON DELETE CASCADE for related items
  const { error } = await supabase
    .from("organizations")
    .delete()
    .eq("id", orgId)

  if (error) return { error: error.message }

  revalidatePath("/admin-dashboard/merchants")
  return { success: true }
}

export async function deleteProduct(productId: string) {
  const supabase = createAdminClient()
  
  // 1. Update product and fetch related owner info
  const { data: productData, error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", productId)
    .select(`
      name,
      organizations (
        name,
        organization_members (
          role,
          profiles (
            email,
            full_name
          )
        )
      )
    `)
    .single()

  if (error) return { error: error.message }

  // 2. Extract Owner Email
  const product: any = productData
  const members = product?.organizations?.organization_members || []
  const owner = members.find((m: any) => m.role === 'owner')

  // 3. Send Notification Email
  if (owner && owner.profiles?.email) {
    try {
      await resend.emails.send({
        from: 'Bemlanja Admin <support@bemlanja.com>',
        to: owner.profiles.email,
        subject: 'Pemberitahuan: Produk Dihapus oleh Admin',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #dc2626;">Produk Dihapus</h2>
            <p>Halo <b>${owner.profiles.full_name}</b>,</p>
            <p>Produk berikut di toko <b>${product.organizations.name}</b> telah dihapus oleh Admin karena alasan kebijakan/kepatuhan:</p>
            <p style="background-color: #fef2f2; padding: 10px; border-left: 4px solid #dc2626; font-weight: bold;">
              ${product.name}
            </p>
            <p>Produk ini tidak lagi muncul di etalase. Jika Anda merasa ini adalah kesalahan, silakan hubungi dukungan kami.</p>
          </div>
        `
      })
    } catch (e) {
      console.error("Failed to send delete notification:", e)
    }
  }

  revalidatePath("/admin-dashboard/products")
  return { success: true }
}

// --- RESTORE PRODUCT ---
export async function restoreProduct(productId: string) {
  const supabase = createAdminClient()
  
  // 1. Restore product and fetch related owner info
  const { data: productData, error } = await supabase
    .from("products")
    .update({ deleted_at: null }) // Restore to null
    .eq("id", productId)
    .select(`
      name,
      organizations (
        name,
        organization_members (
          role,
          profiles (
            email,
            full_name
          )
        )
      )
    `)
    .single()

  if (error) return { error: error.message }

  // 2. Extract Owner Email
  const product: any = productData
  const members = product?.organizations?.organization_members || []
  const owner = members.find((m: any) => m.role === 'owner')

  // 3. Send Notification Email
  if (owner && owner.profiles?.email) {
    try {
      await resend.emails.send({
        from: 'Bemlanja Admin <support@bemlanja.com>',
        to: owner.profiles.email,
        subject: 'Kabar Baik: Produk Dipulihkan',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #16a34a;">Produk Kembali Aktif</h2>
            <p>Halo <b>${owner.profiles.full_name}</b>,</p>
            <p>Produk berikut di toko <b>${product.organizations.name}</b> telah dipulihkan oleh Admin:</p>
            <p style="background-color: #f0fdf4; padding: 10px; border-left: 4px solid #16a34a; font-weight: bold;">
              ${product.name}
            </p>
            <p>Produk ini sekarang sudah kembali muncul di etalase toko Anda.</p>
          </div>
        `
      })
    } catch (e) {
      console.error("Failed to send restore notification:", e)
    }
  }

  revalidatePath("/admin-dashboard/products")
  return { success: true }
}

export async function approveWithdrawal(withdrawalId: string, note: string) {
  const supabase = createAdminClient()

  const { data: rawWithdrawal, error } = await supabase
    .from("withdrawals")
    .update({ 
      status: "approved", 
      admin_note: note,
      processed_at: new Date().toISOString()
    })
    .eq("id", withdrawalId)
    .select(`
      amount,
      organizations (
        name,
        organization_members (
          role,
          profiles (
            email,
            full_name
          )
        )
      )
    `)
    .single()

  if (error) return { error: error.message }

  // FIX: Cast ke 'any' untuk menghindari error TypeScript karena definisi tipe belum update
  const withdrawal: any = rawWithdrawal

  // 2. Cari Email Owner Toko
  const members = withdrawal?.organizations?.organization_members || []
  const owner = members.find((m: any) => m.role === 'owner')
  
  // 3. Kirim Email Notifikasi
  if (owner && owner.profiles?.email) {
    try {
      await resend.emails.send({
        from: 'Bemlanja Finance <support@bemlanja.com>',
        to: owner.profiles.email,
        subject: 'Dana Cair! Penarikan Berhasil',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #16a34a;">Penarikan Dana Berhasil</h2>
            <p>Halo <b>${owner.profiles.full_name}</b>,</p>
            <p>Kami telah mentransfer dana sebesar:</p>
            <h1 style="font-size: 32px; margin: 10px 0; color: #111827;">Rp ${withdrawal.amount.toLocaleString("id-ID")}</h1>
            <p>Untuk toko: <b>${withdrawal.organizations.name}</b></p>
            <hr style="margin: 20px 0; border: 0; border-top: 1px solid #e5e7eb;"/>
            <p style="color: #6b7280; font-size: 14px;">Catatan Admin / Ref Transfer:</p>
            <p style="background-color: #f3f4f6; padding: 10px; border-radius: 4px;">${note}</p>
            <p>Silakan periksa mutasi rekening bank Anda dalam 1x24 jam.</p>
          </div>
        `
      })
    } catch (e) {
      console.error("Gagal mengirim email approval:", e)
    }
  }
  
  revalidatePath("/admin-dashboard/finance")
  return { success: true }
}

export async function rejectWithdrawal(withdrawalId: string, reason: string) {
  const supabase = createAdminClient()

  const { data: rawWithdrawal, error } = await supabase
    .from("withdrawals")
    .update({ 
      status: "rejected", 
      admin_note: reason,
      processed_at: new Date().toISOString()
    })
    .eq("id", withdrawalId)
    .select(`
      amount,
      organizations (
        name,
        organization_members (
          role,
          profiles (
            email,
            full_name
          )
        )
      )
    `)
    .single()

  if (error) return { error: error.message }

  // FIX: Cast ke 'any'
  const withdrawal: any = rawWithdrawal

  const members = withdrawal?.organizations?.organization_members || []
  const owner = members.find((m: any) => m.role === 'owner')

  if (owner && owner.profiles?.email) {
    try {
      await resend.emails.send({
        from: 'Bemlanja Finance <support@bemlanja.com>',
        to: owner.profiles.email,
        subject: 'PENTING: Penarikan Dana Ditolak',
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
            <h2 style="color: #dc2626;">Permintaan Ditolak</h2>
            <p>Halo <b>${owner.profiles.full_name}</b>,</p>
            <p>Mohon maaf, permintaan penarikan dana sebesar <b>Rp ${withdrawal.amount.toLocaleString("id-ID")}</b> tidak dapat kami proses saat ini.</p>
            <div style="background-color: #fef2f2; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <strong style="color: #991b1b;">Alasan Penolakan:</strong><br/>
              ${reason}
            </div>
            <p>Saldo telah dikembalikan ke akun toko Anda. Silakan perbaiki data bank atau hubungi kami jika ada kesalahan, lalu ajukan ulang.</p>
          </div>
        `
      })
    } catch (e) {
      console.error("Gagal mengirim email rejection:", e)
    }
  }

  revalidatePath("/admin-dashboard/finance")
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
      id: 1, // Selalu update baris ID 1
      ...formData,
      updated_at: new Date().toISOString()
    })

  if (error) return { error: error.message }

  revalidatePath("/admin-dashboard/settings")
  return { success: true }
}

export async function sendNotificationEmail(toEmail: string) {
  const settings = await getPlatformSettings() // <-- Ambil settings
  
  await resend.emails.send({
    from: `${settings.platform_name} <support@bemlanja.com>`, // Dynamic Sender Name
    to: toEmail,
    subject: `Halo dari ${settings.platform_name}`,
    html: `
      <h1>Terima kasih!</h1>
      <p>Jika butuh bantuan, hubungi kami di ${settings.support_email}</p>
    `
  })
}