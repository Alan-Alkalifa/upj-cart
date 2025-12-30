"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * Fetch Total Unread Count
 * - For Merchants: specific to their Organization
 * - For Admins: counts all 'store_to_admin' tickets
 */
export async function getUnreadCount(
  role: "merchant" | "admin" | "buyer", 
  orgId?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return 0;

  // Base Query: Count messages NOT read AND NOT sent by the current user
  let query = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .not('is_read', 'eq', true) // Handles both false and null
    .neq('sender_id', user.id); 

  // --- 1. MERCHANT LOGIC ---
  if (role === 'merchant' && orgId) {
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('org_id', orgId);
    
    if (rooms && rooms.length > 0) {
      const roomIds = rooms.map(r => r.id);
      query = query.in('room_id', roomIds);
    } else {
      return 0; 
    }
  } 
  // --- 2. ADMIN LOGIC ---
  else if (role === 'admin') {
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('type', 'store_to_admin');

    if (rooms && rooms.length > 0) {
      const roomIds = rooms.map(r => r.id);
      query = query.in('room_id', roomIds);
    } else {
      return 0;
    }
  }
  // --- 3. BUYER LOGIC (NEW) ---
  else if (role === 'buyer') {
    // Get rooms where the current user is the customer
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('customer_id', user.id);

    if (rooms && rooms.length > 0) {
      const roomIds = rooms.map(r => r.id);
      query = query.in('room_id', roomIds);
    } else {
      return 0;
    }
  }

  const { count } = await query;
  return count || 0;
}

/**
 * Mark all messages in a specific room as read
 */
export async function markRoomAsRead(roomId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('chat_messages')
    .update({ is_read: true }) 
    .eq('room_id', roomId)
    .not('is_read', 'eq', true)
    .neq('sender_id', user.id);
}