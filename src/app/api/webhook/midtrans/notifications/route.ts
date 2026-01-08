// src/app/api/midtrans/notification/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const notificationJson = await request.json();

    // 1. Extract variables for Signature Verification
    const { order_id, status_code, gross_amount, transaction_status, fraud_status } = notificationJson;

    // 2. Verify Signature
    // Signature = SHA512(order_id + status_code + gross_amount + ServerKey)
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    const inputString = order_id + status_code + gross_amount + serverKey;
    const signature = crypto.createHash("sha512").update(inputString).digest("hex");

    if (signature !== notificationJson.signature_key) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 403 });
    }

    // 3. Determine New Order Status
    let newStatus = "";

    if (transaction_status == "capture") {
      if (fraud_status == "challenge") {
        newStatus = "pending"; // Challenge means manual verification needed
      } else if (fraud_status == "accept") {
        newStatus = "paid";
      }
    } else if (transaction_status == "settlement") {
      newStatus = "paid";
    } else if (
      transaction_status == "cancel" ||
      transaction_status == "deny" ||
      transaction_status == "expire"
    ) {
      newStatus = "cancelled";
    } else if (transaction_status == "pending") {
      newStatus = "pending";
    }

    if (!newStatus) {
      return NextResponse.json({ message: "Status not mapped" }, { status: 200 });
    }

    // 4. Update Database
    const supabase = await createClient();

    // NOTE: In your checkout-actions, 'order_id' sent to Midtrans is actually the 'payment_group_id'
    // So we must update ALL orders sharing this payment_group_id.
    
    // A. Update Orders Table
    const { error: updateError } = await supabase
      .from("orders")
      .update({ 
        status: newStatus as any, // Cast to enum
        // If paid, we might want to update tracking or other fields?
      })
      .eq("payment_group_id", order_id); // Matches the ID sent to Midtrans

    if (updateError) {
      console.error("Error updating orders:", updateError);
      return NextResponse.json({ message: "Database update failed" }, { status: 500 });
    }

    // B. Update/Insert Payment Log
    // We try to update the existing payment log created during checkout
    const { error: paymentError } = await supabase
      .from("payments")
      // We assume there's a payment record linked to one of the orders or we query by order_id logic
      // Since payments table has 'order_id' (FK), but we have a group ID here. 
      // Strategy: Find the first order in this group to link the payment, or update based on snap_token if available.
      // Ideally, the 'payments' table should probably handle the group payment.
      // For now, let's update based on the transaction ID if we can find the record, or insert a new log.
      .upsert({
         // We might not have the 'id' of the payment row easily without querying, 
         // but we can query orders first to get an ID. 
         // Simplified: We just log the transaction update.
         // (You might need to adjust this based on how you want to track individual payment rows)
         order_id: (await supabase.from("orders").select("id").eq("payment_group_id", order_id).limit(1).single()).data?.id || "",
         amount: parseFloat(gross_amount),
         payment_type: notificationJson.payment_type,
         transaction_status: transaction_status,
         midtrans_transaction_id: notificationJson.transaction_id,
         snap_token: null // Token already used
      }, { onConflict: 'order_id' }); // Assuming one payment per order group (simplified)


    return NextResponse.json({ message: "OK" });

  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}