// src/app/api/webhook/midtrans/notifications/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin"; // UPDATE: Pakai Admin Client
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const notificationJson = await request.json();

    // 1. Extract variables for Signature Verification
    const { order_id, status_code, gross_amount, transaction_status, fraud_status } = notificationJson;

    // 2. Verify Signature
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
      // 1. Ambil semua Order ID yang terkait dengan Payment Group ini
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id")
        .eq("payment_group_id", order_id);

      if (ordersData && ordersData.length > 0) {
        const orderIds = ordersData.map((o) => o.id);

        // 2. Ambil semua item produk dari order-order tersebut
        const { data: orderItems } = await supabase
          .from("order_items")
          .select("product_variant_id, quantity")
          .in("order_id", orderIds);

        // 3. Loop dan Kembalikan Stok (Restore Stock)
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

        // 4. Restore Coupon (Menggunakan coupon_id yang sudah disimpan di order)
        // Kita hanya perlu mengecek satu order saja dalam grup pembayaran ini
        const { data: orderWithCoupon } = await supabase
           .from("orders")
           .select("coupon_id")
           .eq("payment_group_id", order_id)
           .not("coupon_id", "is", null) // Filter hanya yang punya kupon
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

    // B. Update Orders Table Status
    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: newStatus as any,
      })
      .eq("payment_group_id", order_id);

    if (updateError) {
      console.error("Error updating orders:", updateError);
      return NextResponse.json({ message: "Database update failed" }, { status: 500 });
    }

    // C. Update/Insert Payment Log
    const { data: firstOrder } = await supabase
      .from("orders")
      .select("id")
      .eq("payment_group_id", order_id)
      .limit(1)
      .single();
      
    const { error: paymentError } = await supabase
      .from("payments")
      .upsert(
        {
          order_id: firstOrder?.id || "",
          amount: parseFloat(gross_amount),
          payment_type: notificationJson.payment_type,
          transaction_status: transaction_status,
          midtrans_transaction_id: notificationJson.transaction_id,
          snap_token: null, 
        },
        { onConflict: "order_id" }
      );
      
      if (paymentError) {
        console.error("Error updating payment log:", paymentError);
      }

    return NextResponse.json({ message: "OK" });

  } catch (err) {
    console.error("Webhook Error:", err);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}