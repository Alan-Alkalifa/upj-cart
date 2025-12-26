"use client";

import { useState, useEffect, useRef } from "react";
import { ArrowLeft, MoreVertical, Send } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";
import { markRoomAsRead } from "@/app/actions/notifications";

export function ActiveChatWindow({ 
  room, 
  currentUserId, 
  onBack,
  onMessageSent 
}: { 
  room: any; 
  currentUserId: string; 
  onBack: () => void;
  onMessageSent: () => void;
}) {
  const { messages, send } = useChat(room.id, currentUserId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (room.id) markRoomAsRead(room.id);
  }, [room.id, messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await send(input);
    setInput("");
    onMessageSent();
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* HEADER */}
      <div className="h-16 border-b flex items-center px-4 justify-between bg-background/95 backdrop-blur z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={onBack}>
            <ArrowLeft className="size-5" />
          </Button>
          <Avatar className="h-9 w-9 border">
            <AvatarImage src={room.otherPartyImage || undefined} />
            <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-sm flex items-center gap-2">
              {room.otherPartyName}
              <span className="text-[10px] px-1.5 py-0.5 rounded border bg-muted font-normal text-muted-foreground">Merchant</span>
            </h3>
            {/* <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <span className="block h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Online
            </p> */}
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreVertical className="size-4 text-muted-foreground" />
        </Button>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 min-h-0 bg-muted/5 relative">
        <ScrollArea className="h-full w-full p-4">
          <div className="flex flex-col gap-4 max-w-3xl mx-auto min-h-full justify-end pb-2">
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                   <div className={cn(
                    "max-w-[85%] md:max-w-[70%] px-4 py-2 text-sm shadow-sm",
                    isMe ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                         : "bg-white dark:bg-card text-foreground border rounded-2xl rounded-tl-sm"
                  )}>
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className={cn("text-[9px] mt-1 text-right opacity-70", isMe ? "text-primary-foreground/90" : "text-muted-foreground")}>
                      {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} className="h-1" />
          </div>
        </ScrollArea>
      </div>

      {/* INPUT */}
      <div className="p-4 bg-background border-t shrink-0 z-20">
        <div className="max-w-3xl mx-auto flex gap-2">
          <Input 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Reply as Support..."
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!input.trim()} size="icon">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}