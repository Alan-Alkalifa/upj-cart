"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * 1. FOR BUYERS & MERCHANTS
 * Securely fetches only the rooms the user is involved in + Unread Counts.
 */
export async function getMyChatRooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  // 1. Identify User's Organizations
  const { data: members } = await supabase
    .from("organization_members")
    .select("org_id")
    .eq("profile_id", user.id);

  const myOrgIds = members?.map((m) => m.org_id) || [];

  // 2. Build Query
  let query = supabase
    .from("chat_rooms")
    .select(`
      *,
      organizations (id, name, logo_url),
      profiles (id, full_name, avatar_url),
      last_message:chat_messages(content, created_at)
    `)
    .order("updated_at", { ascending: false });

  if (myOrgIds.length > 0) {
    query = query.or(`customer_id.eq.${user.id},org_id.in.(${myOrgIds.join(',')})`);
  } else {
    query = query.eq("customer_id", user.id);
  }

  const { data: rooms, error } = await query;

  if (error) return { error: error.message };

  // 3. [FIXED] Fetch Unread Counts for these rooms
  // Logic: Check 'is_read' instead of 'read_at'
  let unreadCounts: Record<string, number> = {};
  
  if (rooms.length > 0) {
    const roomIds = rooms.map(r => r.id);
    const { data: unreadData } = await supabase
      .from("chat_messages")
      .select("room_id")
      .in("room_id", roomIds)
      .not("is_read", "eq", true) // FIX: Count if is_read is FALSE or NULL
      .neq("sender_id", user.id);

    if (unreadData) {
      unreadData.forEach((msg) => {
        unreadCounts[msg.room_id] = (unreadCounts[msg.room_id] || 0) + 1;
      });
    }
  }

  // 4. Format Data for UI
  const formattedRooms = rooms.map((room) => {
    const isBuyer = room.customer_id === user.id;

    if (room.type === 'store_to_admin' && !isBuyer) {
       return {
        id: room.id,
        otherPartyName: "Admin Support", 
        otherPartyImage: null,
        lastMessage: getLatestMessage(room.last_message),
        updatedAt: room.updated_at,
        unreadCount: unreadCounts[room.id] || 0,
      };
    }

    const otherParty = isBuyer 
      ? { name: room.organizations?.name || "Store", image: room.organizations?.logo_url }
      : { name: room.profiles?.full_name || "Guest", image: room.profiles?.avatar_url };

    return {
      id: room.id,
      otherPartyName: otherParty.name,
      otherPartyImage: otherParty.image,
      lastMessage: getLatestMessage(room.last_message),
      updatedAt: room.updated_at,
      unreadCount: unreadCounts[room.id] || 0,
    };
  });

  return { rooms: formattedRooms };
}

/**
 * 2. FOR SUPER ADMINS ONLY
 */
export async function getAdminChatRooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") return { error: "Forbidden" };

  const { data: rooms, error } = await supabase
    .from("chat_rooms")
    .select(`
      *,
      organizations (id, name, logo_url),
      last_message:chat_messages(content, created_at)
    `)
    .eq("type", "store_to_admin")
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message };

  // [FIXED] Fetch Admin Unread Counts
  let unreadCounts: Record<string, number> = {};
  if (rooms.length > 0) {
    const roomIds = rooms.map(r => r.id);
    const { data: unreadData } = await supabase
      .from("chat_messages")
      .select("room_id")
      .in("room_id", roomIds)
      .not("is_read", "eq", true) // FIX: Check is_read
      .neq("sender_id", user.id);

    unreadData?.forEach((msg) => {
      unreadCounts[msg.room_id] = (unreadCounts[msg.room_id] || 0) + 1;
    });
  }

  const formattedRooms = rooms.map((room) => {
    return {
      id: room.id,
      otherPartyName: room.organizations?.name || "Unknown Store",
      otherPartyImage: room.organizations?.logo_url,
      lastMessage: getLatestMessage(room.last_message),
      updatedAt: room.updated_at,
      unreadCount: unreadCounts[room.id] || 0,
    };
  });

  return { rooms: formattedRooms };
}

function getLatestMessage(messages: any) {
  if (!Array.isArray(messages) || messages.length === 0) return "No messages yet";
  messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return messages[0].content;
}