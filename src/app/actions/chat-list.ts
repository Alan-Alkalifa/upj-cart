"use server";

import { createClient } from "@/utils/supabase/server";

/**
 * 1. FOR BUYERS & MERCHANTS
 */
export async function getMyChatRooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

  const { data: rooms, error } = await supabase
    .from("chat_rooms")
    .select(`
      *,
      organizations (id, name, logo_url),
      profiles (id, full_name, avatar_url),
      last_message:chat_messages(content, created_at)
    `)
    .order("updated_at", { ascending: false });

  if (error) return { error: error.message };

  const formattedRooms = rooms.map((room) => {
    const isBuyer = room.customer_id === user.id;

    // Handle Support Tickets
    if (room.type === 'store_to_admin' && !isBuyer) {
       return {
        id: room.id,
        otherPartyName: "Admin Support", 
        otherPartyImage: null,
        lastMessage: getLatestMessage(room.last_message),
        updatedAt: room.updated_at,
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
    };
  });

  return { rooms: formattedRooms };
}

/**
 * 2. FOR SUPER ADMINS
 */
export async function getAdminChatRooms() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: "Unauthorized" };

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

  const formattedRooms = rooms.map((room) => {
    return {
      id: room.id,
      otherPartyName: room.organizations?.name || "Unknown Store",
      otherPartyImage: room.organizations?.logo_url,
      lastMessage: getLatestMessage(room.last_message),
      updatedAt: room.updated_at,
    };
  });

  return { rooms: formattedRooms };
}

// --- HELPER FUNCTION: Sorts to find the actual newest message ---
function getLatestMessage(messages: any) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return "No messages yet";
  }

  // 1. Sort messages by 'created_at' descending (Newest First)
  // This fixes the issue where [0] was returning the oldest message
  messages.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 2. Return the top one
  return messages[0].content;
}