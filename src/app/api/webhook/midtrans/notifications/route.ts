// src/app/api/webhook/midtrans/notifications/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const notificationJson = await request.json();
    
    // LOGGING: Debug incoming notification
    console.log("Midtrans Webhook Payload:", JSON.stringify(notificationJson));

    // 1. Extract variables
    // Note: In checkout-actions.ts, we sent 'paymentGroupId' as the Midtrans 'order_id'
    const { 
      order_id: paymentGroupId, 
      status_code, 
      gross_amount, 
      transaction_status, 
      fraud_status,
      signature_key,
      payment_type,
      transaction_id 
    } = notificationJson;

    // 2. Verify Signature
    const serverKey = process.env.MIDTRANS_SERVER_KEY!;
    if (!serverKey) {
      console.error("MIDTRANS_SERVER_KEY is missing in env variables");
      return NextResponse.json({ message: "Server configuration error" }, { status: 500 });
    }

    const inputString = paymentGroupId + status_code + gross_amount + serverKey;
    const signature = crypto.createHash("sha512").update(inputString).digest("hex");

    if (signature !== signature_key) {
      console.error(`Signature Mismatch! Expected: ${signature}, Received: ${signature_key}`);
      return NextResponse.json({ message: "Invalid signature" }, { status: 403 });
    }

    // 3. Determine New Order Status
    let newStatus = "";

    if (transaction_status == "capture") {
      if (fraud_status == "challenge") {
        newStatus = "pending";
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

    // 4. Update Database using Admin Client
    const supabase = createAdminClient();

    // A. LOGIKA ROLLBACK (Hanya jika status menjadi cancelled)
    if (newStatus === "cancelled") {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id")
        .eq("payment_group_id", paymentGroupId);

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map((o) => o.id);

        // Ambil item untuk restore stock
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_variant_id, quantity")
          .in("order_id", orderIds);

        if (orderItems) {
          for (const item of orderItems) {
            if (item.product_variant_id && item.quantity) {
              await supabase.rpc("restore_stock", {
                qty: item.quantity,
                variant_id: item.product_variant_id,
              });
            }
          }
        }

        // Restore Coupon
        const { data: orderWithCoupon } = await supabase
           .from("orders")
           .select("coupon_id")
           .eq("payment_group_id", paymentGroupId)
           .not("coupon_id", "is", null)
           .limit(1)
           .single();
        
        if (orderWithCoupon?.coupon_id) {
           await supabase.rpc("restore_coupon_usage", {
             coupon_id: orderWithCoupon.coupon_id
           });
           console.log("Coupon restored:", orderWithCoupon.coupon_id);
        }
      }
    }

    // B. Update ALL Orders in this Group
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: newStatus as any,
      })
      .eq("payment_group_id", paymentGroupId);

    if (updateError) {
      console.error("Error updating orders status:", updateError);
      return NextResponse.json({ message: "Database update failed" }, { status: 500 });
    }

    // C. Update Payment Log
    // FIX: Find the specific order in this group that holds the payment record.
    // We cannot just grab "limit(1)" because we might grab an order that doesn't have the payment row.
    
    // 1. Get all order IDs in this payment group
    const { data: groupOrders } = await supabase
      .from("orders")
      .select("id")
      .eq("payment_group_id", paymentGroupId);
      
    if (groupOrders && groupOrders.length > 0) {
      const orderIds = groupOrders.map(o => o.id);
      
      // 2. Find which of these orders already has a payment row
      const { data: existingPayment } = await supabase
        .from("payments")
        .select("order_id")
        .in("order_id", orderIds)
        .maybeSingle(); // Returns null if not found, instead of throwing error

      // 3. Determine which Order ID to attach/update payment for
      // If we found an existing payment, use that order_id. 
      // If not (first time insert failed previously?), default to the first order in the group.
      const targetOrderId = existingPayment?.order_id || orderIds[0];

      const { error: paymentError } = await supabase
        .from("payments")
        .upsert(
          {
            order_id: targetOrderId,
            amount: parseFloat(gross_amount),
            payment_type: payment_type,
            transaction_status: transaction_status,
            midtrans_transaction_id: transaction_id,
            // We do NOT overwrite snap_token here as it's not sent in the notification
            // and we want to preserve the one generated during checkout.
          },
          { onConflict: "order_id" }
        );
      
      if (paymentError) {
        console.error("Error updating payment log:", paymentError);
      } else {
        console.log(`Payment updated for Order ID: ${targetOrderId} (Status: ${transaction_status})`);
      }
    } else {
      console.error(`No orders found for Payment Group ID: ${paymentGroupId}`);
    }

    return NextResponse.json({ message: "OK" });

  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}