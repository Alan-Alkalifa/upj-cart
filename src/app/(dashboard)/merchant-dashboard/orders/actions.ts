// src/app/(dashboard)/merchant-dashboard/orders/actions.ts
"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function updateOrderStatus(
  orderId: string, 
  newStatus: string, 
  trackingNumber?: string
) {
  const supabase = await createClient()

  // 1. Validate User Permission
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: "Unauthorized" }

  // 2. Prepare Update Data
  const updateData: any = { status: newStatus }
  
  if (newStatus === 'shipped') {
    if (!trackingNumber) return { success: false, message: "Nomor resi wajib diisi." }
    updateData.tracking_number = trackingNumber
  }

  // 3. Perform Update
  const { error } = await supabase
    .from("orders")
    .update(updateData)
    .eq("id", orderId)
  
  if (error) {
    console.error("Update Order Error:", error)
    return { success: false, message: "Gagal memperbarui pesanan." }
  }

  // 4. Send Email Notification with Order Details
  try {
    const { data: orderData } = await supabase
      .from("orders")
      .select(`
        *,
        profiles:buyer_id (email, full_name),
        organizations (name),
        order_items (
          quantity,
          price_at_purchase,
          product_variants (
            name,
            products (name)
          )
        )
      `)
      .eq("id", orderId)
      .single()

    const order: any = orderData
    const buyerEmail = order?.profiles?.email
    const buyerName = order?.profiles?.full_name || "Pelanggan"
    const storeName = order?.organizations?.name || "Toko"

    if (buyerEmail) {
      const itemsListHtml = order.order_items.map((item: any) => `
        <div style="border-bottom: 1px solid #eee; padding: 10px 0;">
          <p style="margin: 0; font-weight: bold; color: #1f2937;">${item.product_variants.products.name}</p>
          <p style="margin: 2px 0 0; color: #6b7280; font-size: 13px;">
             ${item.product_variants.name} • ${item.quantity} x Rp ${item.price_at_purchase.toLocaleString("id-ID")}
          </p>
        </div>
      `).join("")

      const orderSummaryHtml = `
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px;">
          <h3 style="margin-top: 0; font-size: 14px; color: #374151;">Rincian Pesanan</h3>
          ${itemsListHtml}
          <div style="margin-top: 15px; padding-top: 10px; border-top: 2px solid #e5e7eb;">
            <p style="margin: 5px 0; display: flex; justify-content: space-between; font-size: 14px;">
               <span style="color: #6b7280;">Ongkos Kirim</span>
               <span style="font-weight: 500;">Rp ${order.shipping_cost.toLocaleString("id-ID")}</span>
            </p>
            <p style="margin: 10px 0 0; display: flex; justify-content: space-between; font-weight: bold; font-size: 16px; color: #111827;">
               <span>Total Belanja</span>
               <span>Rp ${order.total_amount.toLocaleString("id-ID")}</span>
            </p>
          </div>
        </div>
      `

      let subject = ""
      let htmlContent = ""

      switch (newStatus) {
        case "packed":
          subject = `Pesanan Sedang Dikemas - ${storeName}`
          htmlContent = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Pesanan Sedang Dikemas 📦</h2>
              <p>Halo <b>${buyerName}</b>,</p>
              <p>Pesanan Anda di <b>${storeName}</b> sedang disiapkan dan dikemas oleh penjual.</p>
              ${orderSummaryHtml}
              <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">Kami akan memberitahu Anda segera setelah pesanan dikirim.</p>
            </div>
          `
          break
        
        case "shipped":
          subject = `Pesanan Telah Dikirim - ${storeName}`
          htmlContent = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Pesanan Dalam Perjalanan 🚚</h2>
              <p>Halo <b>${buyerName}</b>,</p>
              <p>Paket Anda dari <b>${storeName}</b> sudah diserahkan ke kurir.</p>
              
              <div style="background-color: #eff6ff; border: 1px solid #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0; color: #1e40af;"><b>Kurir:</b> ${order.courier_code?.toUpperCase() || "Jasa Kirim"} - ${order.courier_service || ""}</p>
                <p style="margin: 5px 0; color: #1e40af;"><b>No. Resi:</b> <span style="font-family: monospace; font-size: 1.1em; background: #fff; padding: 2px 5px; rounded: 4px;">${trackingNumber}</span></p>
              </div>

              ${orderSummaryHtml}
              <p style="margin-top: 20px;">Silakan lacak pesanan Anda secara berkala.</p>
            </div>
          `
          break
        
        case "completed":
          subject = `Pesanan Selesai - ${storeName}`
          htmlContent = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">Pesanan Selesai ✅</h2>
              <p>Halo <b>${buyerName}</b>,</p>
              <p>Terima kasih telah berbelanja di <b>${storeName}</b>. Pesanan Anda telah selesai.</p>
              ${orderSummaryHtml}
              <p style="margin-top: 20px;">Jangan lupa untuk memberikan ulasan produk Anda!</p>
            </div>
          `
          break
        
        case "cancelled":
          subject = `Pesanan Dibatalkan - ${storeName}`
          htmlContent = `
            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Pesanan Dibatalkan ❌</h2>
              <p>Halo <b>${buyerName}</b>,</p>
              <p>Mohon maaf, pesanan Anda di <b>${storeName}</b> telah dibatalkan.</p>
              ${orderSummaryHtml}
              <p style="margin-top: 20px;">Jika Anda sudah melakukan pembayaran, dana akan dikembalikan ke saldo Anda sesuai kebijakan yang berlaku.</p>
            </div>
          `
          break
      }

      if (subject && htmlContent) {
        await resend.emails.send({
          from: 'Bemlanja Updates <support@bemlanja.com>',
          to: buyerEmail,
          subject: subject,
          html: htmlContent
        })
      }
    }
  } catch (emailError) {
    console.error("Failed to send email to buyer:", emailError)
  }

  // 5. Revalidate Page
  revalidatePath("/merchant-dashboard/orders")
  return { success: true, message: "Status diperbarui & notifikasi dikirim." }
}

// --- Specific Action Exports to Fix Module Errors ---

export async function processOrder(orderId: string) {
  return await updateOrderStatus(orderId, "packed")
}

export async function shipOrder(orderId: string, values: { tracking_number: string }) {
  return await updateOrderStatus(orderId, "shipped", values.tracking_number)
}

export async function completeOrder(orderId: string) {
  return await updateOrderStatus(orderId, "completed")
}