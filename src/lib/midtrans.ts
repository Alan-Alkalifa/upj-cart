// src/lib/midtrans.ts

import midtransClient from 'midtrans-client';

// Create the Snap client instance
export const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  serverKey: process.env.MIDTRANS_SERVER_KEY!, 
  clientKey: process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY!
});

interface TransactionParams {
  orderId: string;
  grossAmount: number;
  customerDetails: {
    first_name: string;
    email: string;
    phone: string;
  };
  itemDetails?: any[];
}

export async function createSnapToken(params: TransactionParams) {
  try {
    const parameter = {
      transaction_details: {
        order_id: params.orderId,
        gross_amount: params.grossAmount,
      },
      customer_details: params.customerDetails,
      item_details: params.itemDetails,
      credit_card: {
        secure: true,
      },
      // Optional: Add redirect URL for "Finish" button in the popup
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_SITE_URL}/orders/history`,
      },
    };

    const transaction = await snap.createTransaction(parameter);
    return transaction.token;
  } catch (error) {
    console.error("Midtrans Error:", error);
    throw new Error("Payment gateway initialization failed");
  }
}
