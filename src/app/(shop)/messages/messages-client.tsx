"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation"; // Added useRouter for cleaner URL handling
import { Search, MessageCircle, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getMyChatRooms } from "@/app/actions/chat-list"; //
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
// Ensure this path is correct based on your project structure
import { ActiveChatWindow } from "@/components/chat/active-chat-window"; 

export type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

export function BuyerMessagesClient({ currentUserId }: { currentUserId: string }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const isInitialMount = useRef(true);

  // 1. Fetch Rooms
  const fetchRooms = useCallback(async () => {
    const { rooms: fetchedRooms, error } = await getMyChatRooms();
    if (error) {
      console.error("Error fetching rooms:", error);
    } else {
      setRooms(fetchedRooms || []);
    }
    setLoading(false);
    return fetchedRooms || [];
  }, []); 

  // 2. Handle URL Params & Selection
  useEffect(() => {
    const init = async () => {
      const fetchedRooms = await fetchRooms();
      
      if (isInitialMount.current) {
        const paramId = searchParams.get('id');
        if (paramId && fetchedRooms.length > 0) {
          const target = fetchedRooms.find(r => r.id === paramId);
          if (target) setSelectedRoom(target);
        }
        isInitialMount.current = false;
      }
    };
    init();
  }, [fetchRooms, searchParams]);

  // 3. Realtime Listener
  useEffect(() => {
    if (!currentUserId) return;
    const channel = supabase.channel(`buyer_chat_list_${currentUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages' }, 
        () => fetchRooms()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUserId, fetchRooms, supabase]);

  // Handle Back Button (Mobile)
  const handleBack = () => {
    setSelectedRoom(null);
    // Optional: Clear URL param to keep state clean
    router.replace('/messages', { scroll: false });
  };

  const filteredRooms = rooms.filter(r => 
    r.otherPartyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-1 h-full overflow-hidden bg-background">
      
      {/* --- LEFT PANEL (Room List) --- */}
      {/* RESPONSIVE LOGIC: 
          - Mobile (< md): Hidden if a room is selected. Visible if no room selected.
          - Desktop (>= md): Always flex (visible). 
      */}
      <div className={cn(
        "w-full md:w-[320px] lg:w-[360px] flex-col border-r bg-muted/5 h-full",
        selectedRoom ? "hidden md:flex" : "flex"
      )}>
        
        {/* Header */}
        <div className="p-4 border-b space-y-3 shrink-0 bg-background z-10">
          <h1 className="font-bold text-xl flex items-center gap-2">
            Pesan
            {rooms.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {rooms.length}
              </span>
            )}
          </h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Cari toko..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-muted/20"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            {loading ? (
               <div className="p-4 space-y-4">
                 {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
               </div>
            ) : filteredRooms.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[50vh] text-muted-foreground text-center p-6 space-y-4">
                <div className="bg-muted p-4 rounded-full">
                    <MessageCircle className="size-8 opacity-40" />
                </div>
                <div>
                    <h3 className="font-semibold text-foreground">Belum ada percakapan</h3>
                    <p className="text-sm mt-1 max-w-[200px] mx-auto text-muted-foreground">Mulai chat dengan penjual dari halaman produk.</p>
                </div>
                <Button asChild variant="outline" size="sm" className="rounded-full">
                    <Link href="/search">Cari Produk</Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col">
                {filteredRooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={cn(
                      "flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-all border-b border-border/40 last:border-0 active:bg-muted",
                      selectedRoom?.id === room.id && "bg-primary/5 border-l-4 border-l-primary pl-3"
                    )}
                  >
                    <Avatar className="h-12 w-12 border bg-white shrink-0">
                      <AvatarImage src={room.otherPartyImage || undefined} className="object-cover" />
                      <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="font-semibold truncate text-sm text-foreground">{room.otherPartyName}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                           {new Date(room.updatedAt).toLocaleDateString([], {month:'short', day:'numeric'})}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center gap-2">
                        <p className={cn(
                          "text-xs truncate flex-1 line-clamp-1",
                          room.unreadCount > 0 ? "font-semibold text-foreground" : "text-muted-foreground"
                        )}>
                          {room.lastMessage}
                        </p>
                        
                        {room.unreadCount > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-[10px] shrink-0 animate-in zoom-in shadow-sm">
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

      {/* --- RIGHT PANEL (Chat Window) --- */}
      {/* RESPONSIVE LOGIC:
          - Mobile (< md): Visible ONLY if a room is selected.
          - Desktop (>= md): Always visible (flex).
      */}
      <div className={cn(
        "flex-1 flex-col bg-background h-full min-w-0 z-20", // z-20 ensures it sits above lists on small screens if absolute
        !selectedRoom ? "hidden md:flex" : "flex fixed inset-0 top-16 md:static" // Fixed inset-0 covers full screen on mobile
      )}>
        {selectedRoom ? (
          <ActiveChatWindow 
            room={selectedRoom} 
            currentUserId={currentUserId} 
            onBack={handleBack} 
            onMessageSent={fetchRooms}
          />
        ) : (
          <div className="hidden md:flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="bg-muted/30 p-8 rounded-full mb-4">
              <ShoppingBag className="size-16 opacity-20" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Kotak Masuk UPJ Cart</h3>
            <p className="text-sm mt-1">Pilih percakapan untuk melihat detail.</p>
          </div>
        )}
      </div>
    </div>
  );
}