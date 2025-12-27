"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * Fetch Total Unread Count
 * - For Merchants: specific to their Organization
 * - For Admins: counts all 'store_to_admin' tickets
 */
export async function getUnreadCount(role: 'merchant' | 'admin', orgId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;

  // FIX: Check 'is_read' instead of 'read_at'
  // We count messages where is_read is FALSE (or NULL) and NOT sent by me
  let query = supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .not('is_read', 'eq', true) // Handles both false and null
    .neq('sender_id', user.id); 

  if (role === 'merchant' && orgId) {
    // 1. Get Room IDs for this Organization
    const { data: rooms } = await supabase
      .from('chat_rooms')
      .select('id')
      .eq('org_id', orgId);
    
    if (rooms && rooms.length > 0) {
      const roomIds = rooms.map(r => r.id);
      query = query.in('room_id', roomIds);
    } else {
      return 0; // No rooms = No messages
    }
  } else if (role === 'admin') {
    // 1. Get Room IDs for Support Tickets
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

  // FIX: Update 'is_read' to true instead of setting a timestamp
  await supabase
    .from('chat_messages')
    .update({ is_read: true }) 
    .eq('room_id', roomId)
    .not('is_read', 'eq', true) // Only update unread ones to save resources
    .neq('sender_id', user.id);
}