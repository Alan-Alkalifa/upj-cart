"use client";

import { useState, useEffect } from "react";
import { useChat } from "@/hooks/use-chat";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageCircle, Send } from "lucide-react";
import { startBuyerChat } from "@/app/actions/chat";
import { markRoomAsRead } from "@/app/actions/notifications";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatSheetProps {
  orgId: string;
  storeName: string;
  currentUserId: string | null;
}

export function ChatSheet({ orgId, storeName, currentUserId }: ChatSheetProps) {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  
  const { messages, send } = useChat(roomId || "", currentUserId || "");

  const handleOpen = async () => {
    if (!currentUserId) {
      toast.error("Please login to chat");
      return;
    }
    setIsOpen(true);
    
    if (!roomId) {
      const res = await startBuyerChat(orgId);
      if (res.error) {
        toast.error(res.error);
        setIsOpen(false);
      } else if (res.roomId) {
        setRoomId(res.roomId);
      }
    }
  };

  // Realtime Mark as Read
  useEffect(() => {
    if (isOpen && roomId) {
      markRoomAsRead(roomId);
    }
  }, [isOpen, roomId, messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    send(input);
    setInput("");
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button onClick={handleOpen} variant="outline" className="gap-2">
          <MessageCircle className="size-4" />
          Chat with Seller
        </Button>
      </SheetTrigger>
      
      <SheetContent side="right" className="flex flex-col h-full w-full sm:max-w-md p-0">
        <SheetHeader className="p-4 border-b shrink-0">
          <SheetTitle>Chat with {storeName}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full p-4">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId;
                return (
                  <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[80%] rounded-xl px-4 py-2 text-sm shadow-sm",
                      isMe ? "bg-primary text-primary-foreground rounded-tr-none"
                           : "bg-muted text-muted-foreground rounded-tl-none"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-center text-muted-foreground text-sm mt-10">
                  Start a conversation about this product!
                </p>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="p-4 border-t flex gap-2 shrink-0">
          <Input 
            placeholder="Type a message..." 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <Button size="icon" onClick={handleSend} className="bg-primary">
            <Send className="size-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}