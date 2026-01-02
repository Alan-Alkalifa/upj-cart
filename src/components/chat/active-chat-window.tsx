"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MoreVertical, Send, Check, CheckCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (room.id) {
      markRoomAsRead(room.id);
    }
  }, [room.id, messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await send(input);
    setInput("");
    onMessageSent();
  };

  return (
    <div className="flex flex-col h-full w-full max-w-full overflow-hidden">
      {/* --- HEADER --- */}
      <div className="h-16 border-b flex items-center px-4 justify-between bg-background/95 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-3 overflow-hidden">
          {/* Back Button (Mobile Only) */}
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

      <div className="flex-1 min-h-0 bg-muted/5 relative overflow-x-hidden w-full">
        <ScrollArea className="h-full w-full p-4">
          {/* UPDATED: 
      1. Changed 'max-w-full' to 'w-full' to force full width.
      2. Removed 'mx-auto' so it doesn't try to center itself if width is constricted.
    */}
          <div className="flex flex-col gap-4 w-full min-h-full justify-end pb-2">
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full",
                    isMe ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      // Note: The bubbles themselves are still restricted to 85% (mobile) / 70% (desktop)
                      // for readability. If you want the BUBBLES to also be full screen,
                      // remove 'max-w-[85%] md:max-w-[70%]' below.
                      "relative max-w-[85%] md:max-w-[70%] px-4 py-2 text-sm shadow-sm flex flex-col gap-1",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                        : "bg-white dark:bg-card text-foreground border rounded-2xl rounded-tl-sm"
                    )}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap break-words">
                      {msg.content}
                    </p>

                    {/* Time & Read Status */}
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-[9px]",
                        isMe
                          ? "justify-end text-primary-foreground/90"
                          : "justify-end text-muted-foreground opacity-70"
                      )}
                    >
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>

                      {isMe && (
                        <span title={msg.is_read ? "Read" : "Sent"}>
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
            <div ref={scrollRef} className="h-1" />
          </div>
        </ScrollArea>
      </div>

      {/* --- INPUT AREA --- */}
      {/* Added pb-6 for mobile safe area handling */}
      <div className="p-3 pb-6 md:pb-4 bg-background border-t shrink-0 z-20">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Tulis pesan..."
            className="flex-1"
            autoComplete="off"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim()}
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
