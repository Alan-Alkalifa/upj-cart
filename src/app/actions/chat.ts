"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * 1. START CHAT: BUYER -> STORE
 * Used by customers on product pages.
 */
export async function startBuyerChat(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Check if room exists
  const { data: existingRoom } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("org_id", orgId)
    .eq("customer_id", user.id)
    .maybeSingle();

  if (existingRoom) return { roomId: existingRoom.id };

  // Create new room
  const { data: newRoom, error } = await supabase
    .from("chat_rooms")
    .insert({
      org_id: orgId,
      customer_id: user.id,
      type: "buyer_to_store",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { roomId: newRoom.id };
}

/**
 * 2. START CHAT: MERCHANT -> ADMIN (SUPPORT)
 * Used by merchants to contact support.
 */
export async function startAdminChat(orgId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // Check if a Support Room already exists for this Org
  // Note: For support rooms, customer_id is NULL (or could be set to user.id depending on schema, 
  // but usually NULL + type='store_to_admin' is enough to identify the channel)
  const { data: existingRoom } = await supabase
    .from("chat_rooms")
    .select("id")
    .eq("org_id", orgId)
    .eq("type", "store_to_admin")
    .maybeSingle();

  if (existingRoom) return { roomId: existingRoom.id };

  // Create new Support Room
  const { data: newRoom, error } = await supabase
    .from("chat_rooms")
    .insert({
      org_id: orgId,
      type: "store_to_admin",
      status: "open",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  return { roomId: newRoom.id };
}



/**
 * 3. SEND MESSAGE
 * Generic function for all chat types.
 */export async function sendMessage(roomId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Simpan Pesan Baru
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room_id: roomId,
      sender_id: user.id,
      content: content,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  
  // 2. UPDATE WAKTU ROOM (PENTING AGAR NAIK KE ATAS)
  // Tanpa langkah ini, chat tidak akan pindah ke "Terbaru"
  const { error: updateError } = await supabase
    .from("chat_rooms")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", roomId);

  if (updateError) {
     console.error("Gagal update waktu room:", updateError.message);
  }

  return { success: true, data };
}