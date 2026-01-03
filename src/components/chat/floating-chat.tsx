"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { MessageCircle, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getMyChatRooms } from "@/app/actions/chat-list";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { ActiveChatWindow } from "@/components/chat/active-chat-window";
import { SupportChatButton } from "@/components/dashboard/support-chat-button";
import { SidebarBadge } from "@/components/dashboard/sidebar-badge";

export type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

interface FloatingChatWidgetProps {
  currentUserId: string;
}

export function FloatingChatWidget({ currentUserId }: FloatingChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [orgId, setOrgId] = useState<string | null>(null);

  // Memoize the client to ensure stability across renders
  const supabase = useMemo(() => createClient(), []);

  // Use a ref to track 'isOpen' status inside the event listener 
  // without triggering re-subscriptions
  const isOpenRef = useRef(isOpen);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  const totalUnread = rooms.reduce((acc, room) => acc + room.unreadCount, 0);

  useEffect(() => {
    const fetchOrg = async () => {
      const { data } = await supabase
        .from("organization_members")
        .select("org_id")
        .eq("profile_id", currentUserId)
        .single();
      if (data) setOrgId(data.org_id);
    };
    if (currentUserId) fetchOrg();
  }, [currentUserId, supabase]);

  const fetchRooms = useCallback(async () => {
    const { rooms, error } = await getMyChatRooms();
    if (error) {
      console.error("Error fetching rooms:", error);
    } else {
      setRooms(rooms || []);
    }
    setLoading(false);
  }, []);

  // --- [NEW FEATURE] Listen for 'open-chat-room' event ---
  useEffect(() => {
    const handleOpenChat = async (e: any) => {
      const targetRoomId = e.detail?.roomId;
      
      // 1. Open the widget
      setIsOpen(true);

      if (targetRoomId) {
        setLoading(true);
        // 2. Refresh rooms to ensure we have the latest (including the new one)
        const { rooms: freshRooms } = await getMyChatRooms();
        setRooms(freshRooms || []);
        setLoading(false);

        // 3. Find and select the target room
        const target = freshRooms?.find((r) => r.id === targetRoomId);
        if (target) {
          setSelectedRoom(target);
        }
      }
    };

    window.addEventListener("open-chat-room", handleOpenChat);
    return () => window.removeEventListener("open-chat-room", handleOpenChat);
  }, []);
  // --------------------------------------------------------

  // Add 'supabase' to dependency array to ensure subscription stays alive
  useEffect(() => {
    if (!currentUserId) return;

    fetchRooms();

    const channelName = `global_messages_float_${currentUserId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        (payload) => {
          // Refresh list on any message change
          fetchRooms();

          // Play sound if widget is closed and new message received
          if (payload.eventType === "INSERT" && !isOpenRef.current) {
            const newMessage = payload.new as { sender_id: string };
            
            // Only play if the message is NOT from the current user
            if (newMessage.sender_id !== currentUserId) {
              const audio = new Audio("/mp3/notify.mp3");
              audio.play().catch((err) => {
                console.error("Audio play failed:", err);
              });
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_rooms" },
        () => {
          // Refresh list on room updates (e.g. read status)
          fetchRooms();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Floating chat connected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, fetchRooms, supabase]);

  // Refresh when room selection changes (to clear unread counts immediately in UI)
  useEffect(() => {
    fetchRooms();
  }, [selectedRoom, fetchRooms]);

  const filteredRooms = rooms.filter((r) =>
    r.otherPartyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-4 right-4 h-14 w-14 rounded-full shadow-xl z-50 hover:scale-105 transition-transform"
          size="icon"
        >
          <MessageCircle className="h-7 w-7" />
          {totalUnread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 rounded-full text-[10px] border-2 border-background animate-in zoom-in"
            >
              {totalUnread > 99 ? "99+" : totalUnread}
            </Badge>
          )}
          <span className="sr-only">Open Chat</span>
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-[450px] p-0 flex flex-col gap-0 border-l sm:border-l overflow-hidden"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Chat Widget</SheetTitle>
        </SheetHeader>

        {selectedRoom ? (
          <div className="flex flex-col h-full w-full max-w-full bg-background animate-in slide-in-from-right-5 duration-200 overflow-hidden">
            <div className="flex-1 min-h-0 relative w-full max-w-full overflow-hidden">
              <ActiveChatWindow
                room={selectedRoom}
                currentUserId={currentUserId}
                onBack={() => setSelectedRoom(null)}
                onMessageSent={fetchRooms}
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full w-full max-w-full overflow-hidden">
            <div className="p-4 border-b bg-muted/10 space-y-4 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-lg tracking-tight">
                    Pesan
                  </h3>
                  <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium">
                    {rooms.length}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {orgId && <SidebarBadge role="merchant" orgId={orgId} />}
                  {orgId && (
                    <SupportChatButton
                      orgId={orgId}
                      currentUserId={currentUserId}
                    />
                  )}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari percakapan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-background h-9"
                />
              </div>
            </div>

            <ScrollArea className="flex-1 w-full">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="space-y-2 flex-1">
                        <div className="h-4 w-1/3 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredRooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground text-center p-6 space-y-2">
                  <MessageCircle className="size-12 mb-2 opacity-10" />
                  <p className="font-medium text-sm">Belum ada pesan</p>
                  <p className="text-xs max-w-[200px]">
                    Percakapan dengan penjual atau pembeli akan muncul di sini.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col w-full">
                  {filteredRooms.map((room) => (
                    <button
                      key={room.id}
                      onClick={() => setSelectedRoom(room)}
                      className="flex items-start gap-3 p-4 text-left hover:bg-muted/50 transition-colors border-b border-border/40 last:border-0 group w-full overflow-hidden"
                    >
                      <Avatar className="h-10 w-10 border shrink-0 transition-transform group-hover:scale-105">
                        <AvatarImage src={room.otherPartyImage || undefined} />
                        <AvatarFallback className="text-xs font-medium">
                          {room.otherPartyName[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-semibold truncate text-sm">
                            {room.otherPartyName}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                            {new Date(room.updatedAt).toLocaleDateString() ===
                            new Date().toLocaleDateString()
                              ? new Date(room.updatedAt).toLocaleTimeString(
                                  [],
                                  {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  }
                                )
                              : new Date(room.updatedAt).toLocaleDateString(
                                  [],
                                  {
                                    month: "short",
                                    day: "numeric",
                                  }
                                )}
                          </span>
                        </div>

                        <div className="flex justify-between items-center gap-2">
                          <p
                            className={cn(
                              "text-xs truncate flex-1",
                              room.unreadCount > 0
                                ? "font-medium text-foreground"
                                : "text-muted-foreground"
                            )}
                          >
                            {room.lastMessage}
                          </p>

                          {room.unreadCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-[10px] shrink-0 shadow-sm"
                            >
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
        )}
      </SheetContent>
    </Sheet>
  );
}