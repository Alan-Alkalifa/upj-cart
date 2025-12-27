"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MessageCircle, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge"; 
import { getAdminChatRooms } from "@/app/actions/chat-list"; //
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { ActiveChatWindow } from "./active-chat-window"; 
import { SidebarBadge } from "@/components/dashboard/sidebar-badge";

export type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

export function AdminMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const searchParams = useSearchParams();
  const supabase = createClient();

  // 1. Fetch Rooms (Refreshes List & Unread Counts)
  const fetchRooms = async () => {
    // Admin specific fetcher
    const { rooms, error } = await getAdminChatRooms();
    if (error) {
      console.error("Error fetching rooms:", error);
    } else {
      setRooms(rooms || []);
      const paramId = searchParams.get('id');
      if (paramId && rooms) {
        const targetRoom = rooms.find(r => r.id === paramId);
        if (targetRoom) setSelectedRoom(targetRoom);
      }
    }
    setLoading(false);
  };

  // Initial Load
  useEffect(() => { fetchRooms(); }, [searchParams]);

  // 2. Refresh on Room Change (Clear badges immediately when leaving)
  useEffect(() => {
    if (rooms.length > 0) fetchRooms();
  }, [selectedRoom]);

  // 3. REALTIME LISTENER
  useEffect(() => {
    if (!currentUserId) return;

    const channelName = `admin_messages_list_${currentUserId}`;

    const channel = supabase.channel(channelName)
      // A. Message Changes (New Message / Read Status)
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_messages' 
        }, 
        () => {
          console.log("Admin Realtime: Message changed, refreshing...");
          fetchRooms();
        }
      )
      // B. Room Changes (Re-sorting)
      .on(
        'postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'chat_rooms' 
        }, 
        () => {
          console.log("Admin Realtime: Room updated, refreshing...");
          fetchRooms();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId]);

  const filteredRooms = rooms.filter(r => 
    r.otherPartyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background md:rounded-xl md:border md:shadow-sm">
      
      {/* --- LEFT PANEL: LIST --- */}
      <div className={cn("w-full md:w-[320px] lg:w-[380px] flex flex-col border-r bg-muted/10 h-full", selectedRoom ? "hidden md:flex" : "flex")}>
        
        {/* Header */}
        <div className="p-4 border-b space-y-3 shrink-0 bg-background/50 backdrop-blur-sm z-10">
          <div className="flex items-center justify-between">
            <h1 className="font-bold text-xl flex items-center gap-2">
              Support Tickets
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {rooms.length}
              </span>
            </h1>
            {/* Admin Global Badge */}
            <SidebarBadge role="admin" />
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
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            {loading ? (
               <div className="p-4 space-y-4">
                 {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
               </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center p-6">
                <MessageCircle className="size-10 mb-3 opacity-20" />
                <p>Tidak ada pesan</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-all border-b border-border/40 last:border-0",
                      selectedRoom?.id === room.id && "bg-primary/5 border-l-4 border-l-primary pl-3"
                    )}
                  >
                    <Avatar className="h-10 w-10 border bg-white shrink-0">
                      <AvatarImage src={room.otherPartyImage || undefined} />
                      <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold truncate text-sm">{room.otherPartyName}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                           {new Date(room.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'}) === new Date().toLocaleDateString([], {month:'short', day:'numeric'})
                              ? new Date(room.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              : new Date(room.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'})}
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

      {/* --- RIGHT PANEL: CHAT WINDOW --- */}
      <div className={cn("flex-1 flex flex-col bg-background h-full min-w-0", !selectedRoom ? "hidden md:flex" : "flex")}>
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
            <p className="text-sm mt-1">Pilih percakapan untuk membalas.</p>
          </div>
        )}
      </div>
    </div>
  );
}