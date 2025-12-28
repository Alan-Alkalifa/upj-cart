"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { 
  MessageCircle, 
  ChevronLeft, 
  Send, 
  Search, 
  MoreVertical, 
  Store,
  Check, 
  CheckCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@/hooks/use-chat"; 
import { getMyChatRooms } from "@/app/actions/chat-list";
import { getUnreadCount, markRoomAsRead } from "@/app/actions/notifications";
import { startBuyerChat } from "@/app/actions/chat"; // Import chat initiator
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

// --- TYPE DEFINITIONS ---
type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

// --- SUB-COMPONENT: CHAT LIST VIEW ---
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
           <div key={i} className="h-14 w-full bg-muted/50 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search Header */}
      <div className="px-4 py-3 shrink-0 border-b">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari percakapan..." 
            className="pl-9 bg-muted/50 border-none rounded-xl h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {filteredRooms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center px-6">
              <MessageCircle className="size-8 opacity-20 mb-3" />
              <p className="font-medium text-sm">Belum ada percakapan</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {filteredRooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => onSelectRoom(room)}
                  className="flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-all border-b border-border/40 last:border-0 group"
                >
                  <Avatar className="h-10 w-10 border bg-white shrink-0">
                    <AvatarImage src={room.otherPartyImage || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
                      {room.otherPartyName[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
                        {room.otherPartyName}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {new Date(room.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center gap-2">
                       <p className={cn(
                          "text-xs truncate leading-relaxed flex-1",
                          room.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}>
                        {room.lastMessage}
                      </p>
                      
                      {/* Unread Badge per Room */}
                      {room.unreadCount > 0 && (
                        <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-[10px] shrink-0 animate-in zoom-in">
                          {room.unreadCount}
                        </Badge>
                      )}
                    </div>
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

  // 1. Auto-scroll on new message
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 2. Mark as Read Logic
  useEffect(() => {
    if (room.id) {
      markRoomAsRead(room.id);
    }
  }, [room.id, messages.length]);

  const handleSend = async () => {
    if (!input.trim()) return;
    await send(input);
    setInput("");
    onMessageSent(); // Trigger list refresh
  };

  return (
    <div className="flex flex-col h-full bg-muted/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b bg-background/95 backdrop-blur z-10 shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full -ml-1" onClick={onBack}>
          <ChevronLeft className="size-5" />
        </Button>
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={room.otherPartyImage || undefined} />
          <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <h4 className="font-semibold text-sm truncate">{room.otherPartyName}</h4>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground">
            <MoreVertical className="size-4" />
        </Button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-4">
          <div className="flex flex-col gap-3 pb-4">
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              return (
                <div key={msg.id} className={cn("flex w-full", isMe ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[85%] px-3 py-2 text-sm shadow-sm flex flex-col gap-1",
                    isMe 
                      ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" 
                      : "bg-white border rounded-2xl rounded-tl-sm"
                  )}>
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    
                    {/* Time & Read Status */}
                    <div className={cn(
                      "flex items-center gap-1.5 text-[9px]",
                      isMe ? "justify-end text-primary-foreground/90" : "justify-end text-muted-foreground opacity-70"
                    )}>
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit' })}
                      </span>
                      
                      {/* READ/UNREAD INDICATORS */}
                      {isMe && (
                        <span>
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

      {/* Input Area */}
      <div className="p-3 bg-background border-t shrink-0">
        <div className="flex gap-2 items-end bg-muted/50 p-1.5 rounded-3xl border focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ketik pesan..." 
            className="border-none shadow-none focus-visible:ring-0 min-h-[40px] bg-transparent px-4"
          />
          <Button 
            size="icon" 
            onClick={handleSend} 
            disabled={!input.trim()} 
            className="rounded-full h-9 w-9 bg-primary shrink-0"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT: GLOBAL FLOATING BUTTON ---
interface FloatingChatProps {
  currentUserId: string;
  orgId?: string;       // Optional: Target Org to chat with
  storeName?: string;   // Optional: Target Store Name
  storeAvatar?: string; // Optional: Target Store Avatar
  customTrigger?: React.ReactNode; // Optional: Custom trigger button
}

export function FloatingChat({ 
  currentUserId,
  orgId,
  storeName,
  storeAvatar,
  customTrigger 
}: FloatingChatProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // 1. Hide on Dashboard Pages (Prevent Duplicate UI)
  const isRestrictedPath = pathname.startsWith("/merchant") || pathname.startsWith("/admin");

  // 2. Data Fetcher Logic
  const refreshAllData = async () => {
    const { data: member } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("profile_id", currentUserId)
        .maybeSingle();

    const count = await getUnreadCount('merchant', member?.org_id);
    setUnreadCount(count || 0);

    const { rooms: fetchedRooms } = await getMyChatRooms();
    setRooms(fetchedRooms || []);
    setLoading(false);
  };

  // 3. Global Realtime Listener
  useEffect(() => {
    if (!currentUserId || isRestrictedPath) return;

    refreshAllData();

    const badgeChannel = supabase.channel(`fc_badge_${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, () => refreshAllData())
      .subscribe();

    const listChannel = supabase.channel(`fc_list_${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => refreshAllData())
      .subscribe();

    return () => {
      supabase.removeChannel(badgeChannel);
      supabase.removeChannel(listChannel);
    };
  }, [currentUserId, isRestrictedPath]);

  // Handle Sheet Open/Close with Org Logic
  const handleOpenChange = async (val: boolean) => {
    setOpen(val);
    
    // When opening, if orgId is present, we DIRECTLY initialize the specific room
    if (val && orgId && storeName) {
      setLoading(true);
      const res = await startBuyerChat(orgId);
      
      if (res.roomId) {
        // Set the active room immediately so the view switches to chat
        setActiveRoom({
          id: res.roomId,
          otherPartyName: storeName,
          otherPartyImage: storeAvatar || null,
          lastMessage: "",
          updatedAt: new Date().toISOString(),
          unreadCount: 0
        });
        await refreshAllData(); // Sync background list
      }
      setLoading(false);
    } 
    // When closing, reset active room
    else if (!val) {
      setActiveRoom(null);
    }
  };

  if (!currentUserId || isRestrictedPath) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {customTrigger ? (
          // Render custom trigger (e.g., from MerchantCard)
          customTrigger
        ) : (
          // Render Default FAB
          <div className="fixed bottom-6 right-6 z-50">
            <Button 
              size="lg" 
              className="h-14 w-14 rounded-full shadow-xl p-0 hover:scale-110 active:scale-95 transition-all duration-300 bg-primary group"
            >
              <MessageCircle className="size-7 fill-white text-white group-hover:rotate-12 transition-transform" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 z-50">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 border-2 border-background text-[10px] text-white items-center justify-center font-bold shadow-sm">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </Button>
          </div>
        )}
      </SheetTrigger>
      
      <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col h-full border-l shadow-2xl overflow-hidden rounded-l-2xl my-2 mr-2 max-h-[calc(100vh-16px)]">
        <div className="px-4 py-3 border-b flex items-center justify-between bg-muted/20 shrink-0">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <Store className="size-4 text-primary" />
            {activeRoom ? "Chat Room" : "Pesan Masuk"}
          </SheetTitle>
        </div>
        
        <div className="flex-1 min-h-0 bg-background">
          {activeRoom ? (
            <ActiveChatView 
              room={activeRoom} 
              currentUserId={currentUserId} 
              onBack={() => setActiveRoom(null)}
              onMessageSent={refreshAllData}
            />
          ) : (
            <ChatList 
                rooms={rooms} 
                loading={loading} 
                onSelectRoom={setActiveRoom} 
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}