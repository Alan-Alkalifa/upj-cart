"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation"; // [NEW IMPORT]
import { 
  MessageCircle, 
  ChevronLeft, 
  Send, 
  Search, 
  MoreVertical, 
  Store 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useChat } from "@/hooks/use-chat"; 
import { getMyChatRooms } from "@/app/actions/chat-list";
import { getUnreadCount, markRoomAsRead } from "@/app/actions/notifications";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
};

// --- SUB-COMPONENT: CHAT LIST ---
function ChatList({ 
  rooms, 
  loading, 
  onSelectRoom 
}: { 
  rooms: ChatRoom[], 
  loading: boolean, 
  onSelectRoom: (room: ChatRoom) => void 
}) {
  const [search, setSearch] = useState("");

  const filteredRooms = rooms.filter(r => 
    r.otherPartyName.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-3 p-4">
        {[1, 2, 3].map((i) => (
           <div key={i} className="h-14 w-full bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari percakapan..." 
            className="pl-9 bg-muted/50 border-none rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full px-2">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center px-6">
              <MessageCircle className="size-8 opacity-40 mb-3" />
              <p className="font-medium">Belum ada percakapan</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1 py-2">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className="flex items-start gap-3 p-3 text-left rounded-xl hover:bg-muted/50 transition-all group"
                >
                  <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
                    <AvatarImage src={room.otherPartyImage || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                      {room.otherPartyName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {room.otherPartyName}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(room.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate leading-relaxed">
                      {room.lastMessage}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: ACTIVE CHAT VIEW ---
function ActiveChatView({ 
  room, 
  currentUserId, 
  onBack,
  onMessageSent 
}: { 
  room: ChatRoom; 
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
    <div className="flex flex-col h-full bg-muted/10 overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onBack}>
          <ChevronLeft className="size-5" />
        </Button>
        <Avatar className="h-9 w-9 border">
          <AvatarImage src={room.otherPartyImage || undefined} />
          <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <h4 className="font-semibold text-sm truncate">{room.otherPartyName}</h4>
          {/* <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" /> Online
          </p> */}
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><MoreVertical className="size-4" /></Button>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-4">
          <div className="flex flex-col gap-3 pb-4">
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] px-4 py-2.5 text-sm shadow-sm",
                    isMe ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                         : "bg-white dark:bg-muted text-foreground border rounded-2xl rounded-tl-sm"
                  )}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    <div className={cn("text-[9px] mt-1 text-right opacity-70", isMe ? "text-primary-foreground/80" : "text-muted-foreground")}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} className="h-1" />
          </div>
        </ScrollArea>
      </div>

      <div className="p-3 bg-background border-t shrink-0">
        <div className="flex gap-2 items-end bg-muted/30 p-1.5 rounded-3xl border">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ketik pesan..." 
            className="border-none shadow-none focus-visible:ring-0 min-h-[40px] bg-transparent px-4"
          />
          <Button size="icon" onClick={handleSend} disabled={!input.trim()} className="rounded-full h-9 w-9 bg-primary">
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN FLOATING COMPONENT ---
export function FloatingChat({ currentUserId }: { currentUserId: string }) {
  const pathname = usePathname(); //
  const [open, setOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // 1. Logic to hide layout in /merchant or /admin
  const isRestrictedPath = pathname.startsWith("/merchant") || pathname.startsWith("/admin");

  const fetchData = async () => {
    const [{ rooms: fetchedRooms }, count] = await Promise.all([
      getMyChatRooms(),
      getUnreadCount('merchant') 
    ]);
    setRooms(fetchedRooms || []);
    setUnreadCount(count || 0);
    setLoading(false);
  };

  useEffect(() => {
    if (!currentUserId || isRestrictedPath) return; // Don't subscribe if path is restricted
    
    fetchData();

    const channel = supabase.channel('floating_chat_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => fetchData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, isRestrictedPath]);

  // If path is restricted or user is not logged in, show nothing
  if (!currentUserId || isRestrictedPath) return null;

  return (
    <Sheet open={open} onOpenChange={(val) => { setOpen(val); if(!val) setActiveRoom(null); }}>
      <SheetTrigger asChild>
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            size="lg" 
            className="h-14 w-14 rounded-full shadow-xl p-0 hover:scale-110 active:scale-95 transition-all duration-300 bg-primary"
          >
            <MessageCircle className="size-7 fill-white text-white" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-background text-[10px] text-white items-center justify-center font-bold">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              </span>
            )}
          </Button>
        </div>
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:w-[450px] p-0 flex flex-col h-full border-l shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/20 shrink-0">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <Store className="size-4 text-primary" />
            {activeRoom ? "Chat Room" : "Daftar Pesan"}
          </SheetTitle>
        </div>
        
        <div className="flex-1 min-h-0">
          {activeRoom ? (
            <ActiveChatView 
              room={activeRoom} 
              currentUserId={currentUserId} 
              onBack={() => setActiveRoom(null)}
              onMessageSent={fetchData}
            />
          ) : (
            <ChatList rooms={rooms} loading={loading} onSelectRoom={setActiveRoom} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}