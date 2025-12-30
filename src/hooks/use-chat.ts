//
"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { sendMessage } from "@/app/actions/chat";
import { toast } from "sonner";

export interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
  room_id: string; // Diperlukan untuk pengecekan manual
}

export function useChat(roomId: string, currentUserId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const supabase = createClient();
  
  // Ref untuk menjaga roomId tetap aksesibel di dalam callback listener
  const roomIdRef = useRef(roomId);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    // 1. Fetch History
    const fetchHistory = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      
      if (error) {
        console.error("Error fetching chat history:", error);
      } else if (data) {
        setMessages(data as any);
      }
    };
    fetchHistory();

    // 2. Subscribe to Realtime
    // Gunakan nama channel unik agar tidak bentrok antar room
    const channel = supabase
      .channel(`active_chat:${roomId}`) 
      .on(
        "postgres_changes",
        {
          event: "*", // Dengarkan INSERT dan UPDATE sekaligus
          schema: "public",
          table: "chat_messages",
          // [FIX]: HAPUS FILTER 'filter: ...' DI SINI
          // Biarkan RLS yang menangani keamanan, dan kita filter room_id di bawah.
        },
        (payload) => {
          const record = payload.new as Message;

          // [FIX]: Client-Side Filtering
          // Pastikan event yang masuk memang milik room yang sedang dibuka
          if (!record || record.room_id !== roomIdRef.current) return;

          // A. Handle Pesan Baru (INSERT)
          if (payload.eventType === "INSERT") {
            setMessages((prev) => {
              // Cegah duplikasi (jika pesan dikirim oleh diri sendiri dan sudah ada di state)
              if (prev.some((m) => m.id === record.id)) return prev;
              return [...prev, record];
            });
          } 
          
          // B. Handle Read Status / Update Lainnya (UPDATE)
          if (payload.eventType === "UPDATE") {
            setMessages((prev) => 
              prev.map((m) => (m.id === record.id ? record : m))
            );
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`Live chat connected for room: ${roomId}`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  // 3. Send Handler
  const send = async (content: string) => {
    if (!content.trim()) return;

    const res = await sendMessage(roomId, content);

    if (res?.error) {
      toast.error("Gagal mengirim pesan");
    } else if (res?.data) {
      const savedMessage = res.data as Message;
      setMessages((prev) => {
        // Cek duplikasi sebelum menambahkan
        if (prev.some((m) => m.id === savedMessage.id)) return prev;
        return [...prev, savedMessage];
      });
    }
  };

  return { messages, send };
}