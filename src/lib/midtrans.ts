import midtransClient from 'midtrans-client';

const snap = new midtransClient.Snap({
  isProduction: process.env.MIDTRANS_IS_PRODUCTION === 'true',
  // Fix: Add '!' to assert that this variable is defined in .env
  serverKey: process.env.MIDTRANS_SERVER_KEY!, 
  clientKey: process.env.MIDTRANS_CLIENT_KEY!
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
      callbacks: {
        finish: `${process.env.NEXT_PUBLIC_AFTER_PAYMENT_URL}/orders/history`,
      },
    };

    const transaction = await snap.createTransaction(parameter);
    return transaction.token;
  } catch (error) {
    console.error("Midtrans Error:", error);
    throw new Error("Payment gateway initialization failed");
  }
}