"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MessageCircle, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"; 
// ✅ CHANGE IMPORT: Import getAdminChatRooms
import { getAdminChatRooms } from "@/app/actions/chat-list"; 
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { ActiveChatWindow } from "@/components/chat/active-chat-window"; 

export type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

// Rename component for clarity (optional but recommended)
export function AdminMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const searchParams = useSearchParams();
  const supabase = createClient();

  // 1. Fetch Admin Rooms Function
  const fetchRooms = async () => {
    // ✅ USE THE ADMIN ACTION
    const { rooms, error } = await getAdminChatRooms();
    
    if (error) {
      console.error("Error fetching admin rooms:", error);
    } else {
      setRooms(rooms || []);
      
      const paramId = searchParams.get('id');
      if (paramId && rooms && !selectedRoom) {
        const targetRoom = rooms.find(r => r.id === paramId);
        if (targetRoom) setSelectedRoom(targetRoom);
      }
    }
    setLoading(false);
  };

  // 2. Initial Load
  useEffect(() => { fetchRooms(); }, [searchParams]);

  // 3. Refresh List on Room Change
  useEffect(() => {
    fetchRooms();
  }, [selectedRoom]);

  // 4. REALTIME LISTENER (Admin Specific)
  useEffect(() => {
    if (!currentUserId) return;

    // Listen to changes where type is 'store_to_admin'
    const channel = supabase.channel(`admin_messages_list`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_messages' 
      }, () => {
          fetchRooms();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'chat_rooms',
        filter: "type=eq.store_to_admin" // Filter only support rooms
      }, () => {
          fetchRooms();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const filteredRooms = rooms.filter(r => 
    r.otherPartyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 h-full w-full max-w-full bg-background">
      
      {/* --- LEFT PANEL: CHAT LIST --- */}
      <div className={cn(
        "flex-col border-r bg-muted/10 h-full",
        "w-full md:w-[320px] lg:w-[380px]", 
        selectedRoom ? "hidden md:flex" : "flex"
      )}>
        
        {/* Header */}
        <div className="p-4 border-b space-y-3 shrink-0 bg-background/50 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-xl flex items-center gap-2">
              Support Inbox
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {rooms.length}
              </span>
            </h1>
          </div>

          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari merchant..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        </div>

        {/* Room List */}
        <div className="flex-1 min-h-0 w-full">
          <ScrollArea className="h-full w-full">
            {loading ? (
               <div className="p-4 space-y-4">
                 {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
               </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center p-6">
                <MessageCircle className="size-10 mb-3 opacity-20" />
                <p>Belum ada pesan masuk</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-all border-b border-border/40 last:border-0 w-full",
                      selectedRoom?.id === room.id && "bg-primary/5 border-l-4 border-l-primary pl-3"
                    )}
                  >
                    <Avatar className="h-10 w-10 border bg-white shrink-0">
                      <AvatarImage src={room.otherPartyImage || undefined} />
                      <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold truncate text-sm block max-w-[150px] sm:max-w-none">
                          {room.otherPartyName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                           {new Date(room.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center gap-2">
                        <p className={cn(
                          "text-xs truncate flex-1",
                          room.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}>
                          {room.lastMessage}
                        </p>
                        
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

      {/* --- RIGHT PANEL: ACTIVE CHAT --- */}
      <div className={cn(
        "flex-col bg-background h-full min-w-0",
        "flex-1", 
        !selectedRoom ? "hidden md:flex" : "flex"
      )}>
        {selectedRoom ? (
          <ActiveChatWindow 
            room={selectedRoom} 
            currentUserId={currentUserId} 
            onBack={() => setSelectedRoom(null)} 
            onMessageSent={fetchRooms}
          />
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="bg-muted/30 p-6 rounded-full mb-4"><Store className="size-12 opacity-20" /></div>
            <h3 className="font-semibold text-lg">Admin Support Center</h3>
            <p className="text-sm mt-1">Pilih chat merchant untuk membalas.</p>
          </div>
        )}
      </div>
    </div>
  );
}