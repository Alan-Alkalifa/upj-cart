"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, MessageCircle, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAdminChatRooms } from "@/app/actions/chat-list";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { ActiveChatWindow } from "./active-chat-window"; 

export type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
};

export function AdminMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const searchParams = useSearchParams();
  const supabase = createClient();

  const fetchRooms = async () => {
    const { rooms, error } = await getAdminChatRooms();
    if (!error) {
      setRooms(rooms || []);
      const paramId = searchParams.get('id');
      if (paramId && rooms) {
        const targetRoom = rooms.find(r => r.id === paramId);
        if (targetRoom) setSelectedRoom(targetRoom);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchRooms(); }, [searchParams]);

  useEffect(() => {
    const channel = supabase.channel('admin_chat_list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms', filter: "type=eq.store_to_admin" }, () => fetchRooms())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filteredRooms = rooms.filter(r => r.otherPartyName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background md:rounded-xl md:border md:shadow-sm">
      {/* --- LEFT PANEL: LIST --- */}
      <div className={cn(
        "w-full md:w-[320px] lg:w-[380px] flex flex-col border-r bg-muted/10 h-full",
        selectedRoom ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b space-y-3 shrink-0 bg-background/50 backdrop-blur-sm z-10">
          <h1 className="font-bold text-xl flex items-center gap-2">
            Support
            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {rooms.length}
            </span>
          </h1>
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search merchants..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-background/50"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            {loading ? (
               <div className="p-4 text-sm text-center text-muted-foreground">Loading tickets...</div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground text-center p-6">
                <MessageCircle className="size-10 mb-3 opacity-20" />
                <p>No open tickets</p>
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
                           {new Date(room.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'})}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{room.lastMessage}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* --- RIGHT PANEL: CHAT --- */}
      <div className={cn(
        "flex-1 flex flex-col bg-background h-full min-w-0",
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
            <div className="bg-muted/30 p-6 rounded-full mb-4">
              <Store className="size-12 opacity-20" />
            </div>
            <h3 className="font-semibold text-lg">Admin Support Console</h3>
            <p className="text-sm mt-1">Select a merchant ticket to start chatting.</p>
          </div>
        )}
      </div>
    </div>
  );
}