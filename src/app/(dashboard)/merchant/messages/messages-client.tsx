"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Search, 
  MessageCircle, 
  Store 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getMyChatRooms } from "@/app/actions/chat-list";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { SupportChatButton } from "@/components/dashboard/support-chat-button"; 
import { ActiveChatWindow } from "./active-chat-window"; 

export type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
};

export function MerchantMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  const searchParams = useSearchParams();
  const supabase = createClient();

  // 1. Fetch Org ID
  useEffect(() => {
    const fetchOrg = async () => {
      const { data } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('profile_id', currentUserId)
        .single();
      
      if (data) setOrgId(data.org_id);
    };
    fetchOrg();
  }, [currentUserId]);

  // 2. Fetch Rooms (Reusable)
  const fetchRooms = async () => {
    const { rooms, error } = await getMyChatRooms();
    if (error) {
      console.error("Error fetching rooms:", error);
    } else {
      setRooms(rooms || []);
      
      const paramId = searchParams.get('id');
      if (paramId && rooms) {
        const targetRoom = rooms.find(r => r.id === paramId);
        if (targetRoom) {
          setSelectedRoom(targetRoom);
        }
      }
    }
    setLoading(false);
  };

  // Initial Load
  useEffect(() => {
    fetchRooms();
  }, [searchParams]);

  // Realtime Listener
  useEffect(() => {
    const channel = supabase
      .channel('merchant_chat_list')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'chat_rooms'
        },
        () => fetchRooms()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredRooms = rooms.filter(r => 
    r.otherPartyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background md:rounded-xl md:border md:shadow-sm">
      
      {/* --- LEFT PANEL: CHAT LIST --- */}
      <div className={cn(
        "w-full md:w-[320px] lg:w-[380px] flex flex-col border-r bg-muted/10 h-full",
        selectedRoom ? "hidden md:flex" : "flex"
      )}>
        {/* Header */}
        <div className="p-4 border-b space-y-3 shrink-0 bg-background/50 backdrop-blur-sm z-10">
          <h1 className="font-bold text-xl flex items-center gap-2">
            Pesan
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {rooms.length}
            </span>
          </h1>

          {orgId && (
            <SupportChatButton orgId={orgId} currentUserId={currentUserId} />
          )}

          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari pembeli..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            {loading ? (
               <div className="p-4 space-y-4">
                 {[1,2,3].map(i => (
                   <div key={i} className="flex gap-3 animate-pulse">
                     <div className="h-10 w-10 bg-muted rounded-full" />
                     <div className="flex-1 space-y-2">
                       <div className="h-4 w-24 bg-muted rounded" />
                       <div className="h-3 w-full bg-muted rounded" />
                     </div>
                   </div>
                 ))}
               </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center p-6">
                <MessageCircle className="size-10 mb-3 opacity-20" />
                <p>Belum ada pesan</p>
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
                      {/* FIX: Use || undefined */}
                      <AvatarImage src={room.otherPartyImage || undefined} />
                      <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold truncate text-sm">
                          {room.otherPartyName}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                           {/* Date Logic */}
                           {new Date(room.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'}) === new Date().toLocaleDateString([], {month:'short', day:'numeric'})
                              ? new Date(room.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                              : new Date(room.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'})
                           }
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
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

      {/* --- RIGHT PANEL: ACTIVE CHAT --- */}
      <div className={cn(
        "flex-1 flex flex-col bg-background h-full min-w-0",
        !selectedRoom ? "hidden md:flex" : "flex"
      )}>
        {selectedRoom ? (
          <ActiveChatWindow 
            room={selectedRoom} 
            currentUserId={currentUserId} 
            onBack={() => setSelectedRoom(null)} 
            onMessageSent={fetchRooms} // [IMPORTANT] Updates list instantly
          />
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="bg-muted/30 p-6 rounded-full mb-4">
              <Store className="size-12 opacity-20" />
            </div>
            <h3 className="font-semibold text-lg">UPJ Cart Messenger</h3>
            <p className="text-sm mt-1">Pilih percakapan dari daftar untuk memulai.</p>
          </div>
        )}
      </div>

    </div>
  );
}