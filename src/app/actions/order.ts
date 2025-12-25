import { getPlatformSettings } from "@/utils/get-settings"

export async function processOrderPayment(orderId: string, orderTotal: number) {
  // 1. Ambil Settings (Fee %)
  const settings = await getPlatformSettings()
  
  // 2. Hitung Potongan
  // Misal Total: 100.000, Fee: 5%
  // Admin Fee = 5.000
  // Merchant Net = 95.000
  const feePercent = Number(settings.transaction_fee_percent) || 0
  const adminFeeAmount = Math.round(orderTotal * (feePercent / 100))
  const merchantNetAmount = orderTotal - adminFeeAmount

  // 3. Simpan ke Database (Update Order / Insert Transaction Log)
  /*
    UPDATE orders SET 
      status = 'paid',
      admin_fee = adminFeeAmount,  <-- Simpan ini agar laporan keuangan akurat
      merchant_revenue = merchantNetAmount
    WHERE id = orderId
  */
  
  console.log(`Order ${orderId} Processed. Fee: ${feePercent}%. Admin: ${adminFeeAmount}, Merchant: ${merchantNetAmount}`)
}