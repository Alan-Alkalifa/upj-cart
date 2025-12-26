"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { sendMessage } from "@/app/actions/chat";
import { toast } from "sonner";

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

export function useChat(roomId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!roomId) return;

    // 1. Fetch History
    const fetchHistory = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      
      if (data) setMessages(data as any);
    };
    fetchHistory();

    // 2. Subscribe to Realtime
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // DEDUPLICATION: Only add if it's not already in the list
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // 3. Send Handler (Updated)
  const send = async (content: string) => {
    if (!content.trim()) return;

    // Call Server Action
    const res = await sendMessage(roomId, content);

    if (res?.error) {
      toast.error("Failed to send message");
    } else if (res?.data) {
      // SUCCESS: Add to UI immediately
      const savedMessage = res.data as Message;
      
      setMessages((prev) => {
        // Double check for duplicates
        if (prev.some((m) => m.id === savedMessage.id)) return prev;
        return [...prev, savedMessage];
      });
    }
  };

  return { messages, send };
}