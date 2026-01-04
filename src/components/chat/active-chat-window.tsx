"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Send, Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import { markRoomAsRead } from "@/app/actions/notifications";

type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

interface ActiveChatWindowProps {
  room: ChatRoom;
  currentUserId: string;
  onBack: () => void;
  onMessageSent: () => void;
}

export function ActiveChatWindow({
  room,
  currentUserId,
  onBack,
  onMessageSent,
}: ActiveChatWindowProps) {
  const { messages, send } = useChat(room.id, currentUserId);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false); // [!code ++]
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Ref to track the ID of the last message we notified about
  // Initialize with null so we know when it's the first load
  const lastProcessedMessageId = useRef<string | null>(null);

  // --- AUTO-SCROLL ---
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // --- NOTIFICATION SOUND LOGIC ---
  useEffect(() => {
    if (messages.length === 0) return;

    const latestMessage = messages[messages.length - 1];

    // Check if this is a new message ID we haven't seen yet in this session
    if (latestMessage.id !== lastProcessedMessageId.current) {
      
      // If lastProcessedMessageId is NOT null, it means we aren't in the initial load phase.
      // We only want to play sound for NEW messages arriving after the component mounted,
      // and only if the sender is NOT the current user.
      if (
        lastProcessedMessageId.current !== null && 
        latestMessage.sender_id !== currentUserId
      ) {
        // Next.js serves 'public' folder at root, so 'public/mp3/notify.mp3' becomes '/mp3/notify.mp3'
        const audio = new Audio("/mp3/notify.mp3");
        audio.play().catch((error) => {
          console.error("Audio play failed (interaction required):", error);
        });
      }

      // Update the ref to the current latest ID
      lastProcessedMessageId.current = latestMessage.id;
    }
  }, [messages, currentUserId]);

  // --- MARK AS READ ---
  useEffect(() => {
    if (room.id) {
      markRoomAsRead(room.id);
    }
  }, [room.id, messages.length]);

  // --- RESET NOTIFICATION REF ON ROOM CHANGE ---
  // If the user switches rooms, we need to reset the tracker so we don't ding for history
  useEffect(() => {
    lastProcessedMessageId.current = null;
  }, [room.id]);

  const handleSend = async () => {
    if (!input.trim() || isSending) return; // [!code ++]
    
    setIsSending(true); // [!code ++]
    try {
      await send(input);
      setInput("");
      onMessageSent();
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsSending(false); // [!code ++]
    }
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden bg-background">
      {/* --- HEADER --- */}
      <div className="h-16 border-b flex items-center px-4 justify-between bg-background/95 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button
            variant="ghost"
            size="icon"
            className="-ml-2 shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="size-5" />
          </Button>

          <Avatar className="h-9 w-9 border shrink-0">
            <AvatarImage src={room.otherPartyImage || undefined} />
            <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
          </Avatar>

          <div className="min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {room.otherPartyName}
            </h3>
          </div>
        </div>
      </div>

      {/* --- MESSAGES AREA --- */}
      <div className="flex-1 overflow-y-auto min-h-0 w-full bg-muted/5 scroll-smooth">
        <div className="flex flex-col gap-4 p-4 w-full min-h-full justify-end">
          {messages.map((msg) => {
            const isMe = msg.sender_id === currentUserId;

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex w-full",
                  isMe ? "justify-end pl-10" : "justify-start pr-10"
                )}
              >
                <div
                  className={cn(
                    "relative px-4 py-2 text-sm shadow-sm flex flex-col gap-1",
                    "max-w-[88%] sm:max-w-[75%] md:max-w-[60%] xl:max-w-[50%]",
                    isMe
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                      : "bg-white dark:bg-card text-foreground border rounded-2xl rounded-tl-sm"
                  )}
                >
                  <p className="leading-relaxed whitespace-pre-wrap break-words">
                    {msg.content}
                  </p>

                  <div
                    className={cn(
                      "flex items-center gap-1.5 text-[9px] sm:text-[10px]",
                      isMe
                        ? "justify-end text-primary-foreground/90"
                        : "justify-end text-muted-foreground opacity-70"
                    )}
                  >
                    <span className="shrink-0">
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>

                    {isMe && (
                      <span
                        title={msg.is_read ? "Read" : "Sent"}
                        className="shrink-0"
                      >
                        {msg.is_read ? (
                          <CheckCheck className="size-3.5 stroke-[2] text-blue-300" />
                        ) : (
                          <Check className="size-3.5 stroke-[2] opacity-70" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} className="h-1 shrink-0" />
        </div>
      </div>

      {/* --- INPUT AREA --- */}
      <div className="p-3 pb-6 md:pb-4 bg-background border-t shrink-0 z-20">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Tulis pesan..."
            className="flex-1"
            autoComplete="off"
            disabled={isSending} // [!code ++]
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isSending} // [!code ++]
            size="icon"
            className="shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}