"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  MessageCircle,
  ChevronLeft,
  Send,
  Search,
  Store,
  Check,
  CheckCheck,
  XCircle,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useChat } from "@/hooks/use-chat";
// RESTORED: Import logic from the reference code
import { getMyChatRooms } from "@/app/actions/chat-list";
import { getUnreadCount, markRoomAsRead } from "@/app/actions/notifications";
import { startBuyerChat } from "@/app/actions/chat";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type ChatRoom = {
  id: string;
  otherPartyName: string;
  otherPartyImage: string | null;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

// --- HELPER: PRODUCT PARSER ---
const parseProductMessage = (content: string) => {
  const productRegex = /^\[Produk: (.*?) - Rp (.*?)(?: \| IMG: (.*?))?\]([\s\S]*)?$/;
  const match = content.match(productRegex);

  if (match) {
    return {
      isProduct: true,
      name: match[1],
      price: match[2],
      image: match[3] || null,
      additionalText: match[4] ? match[4].trim() : "",
    };
  }
  return { isProduct: false };
};

// --- SUB-COMPONENT: CHAT LIST VIEW ---
function ChatList({
  rooms,
  loading,
  onSelectRoom,
}: {
  rooms: ChatRoom[];
  loading: boolean;
  onSelectRoom: (room: ChatRoom) => void;
}) {
  const [search, setSearch] = useState("");

  // Logic filter from Code A implemented here
  const filteredRooms = rooms.filter((r) =>
    r.otherPartyName.toLowerCase().includes(search.toLowerCase())
  );

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

      {/* Room List UI */}
      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 w-full bg-muted/50 animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
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
                        {new Date(room.updatedAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        }) ===
                        new Date().toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })
                          ? new Date(room.updatedAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date(room.updatedAt).toLocaleDateString([], {
                              month: "short",
                              day: "numeric",
                            })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center gap-2">
                      <p
                        className={cn(
                          "text-xs truncate leading-relaxed flex-1",
                          room.unreadCount > 0
                            ? "font-semibold text-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {room.lastMessage.startsWith("[Produk:")
                          ? "Sent a product..."
                          : room.lastMessage}
                      </p>

                      {room.unreadCount > 0 && (
                        <Badge
                          variant="destructive"
                          className="h-5 min-w-5 rounded-full px-1.5 flex items-center justify-center text-[10px] shrink-0 animate-in zoom-in"
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
    </div>
  );
}

// --- SUB-COMPONENT: ACTIVE CHAT VIEW ---
function ActiveChatView({
  room,
  currentUserId,
  pendingProduct,
  onRemoveProduct,
  onBack,
  onMessageSent,
}: {
  room: ChatRoom;
  currentUserId: string;
  pendingProduct: any;
  onRemoveProduct: () => void;
  onBack: () => void;
  onMessageSent: () => void;
}) {
  const { messages, send } = useChat(room.id, currentUserId);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (room.id) markRoomAsRead(room.id);
  }, [room.id, messages.length]);

  const handleSend = async () => {
    if (!input.trim() && !pendingProduct) return;

    let finalContent = input;

    if (pendingProduct) {
      const productInfo = `[Produk: ${pendingProduct.name} - Rp ${pendingProduct.price.toLocaleString(
        "id-ID"
      )} | IMG: ${pendingProduct.image || ""}]`;
      finalContent = input ? `${productInfo}\n${input}` : productInfo;
    }

    await send(finalContent);
    setInput("");
    onMessageSent();
  };

  return (
    <div className="flex flex-col h-full bg-muted/5 overflow-hidden">
      <div className="flex items-center gap-2 p-3 border-b bg-background/95 backdrop-blur z-10 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full -ml-1"
          onClick={onBack}
        >
          <ChevronLeft className="size-5" />
        </Button>
        <Avatar className="h-8 w-8 border">
          <AvatarImage src={room.otherPartyImage || undefined} />
          <AvatarFallback>{room.otherPartyName[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <h4 className="font-semibold text-sm truncate">
            {room.otherPartyName}
          </h4>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full p-4">
          <div className="flex flex-col gap-3 pb-4">
            {messages.map((msg: any) => {
              const isMe = msg.sender_id === currentUserId;
              const parsed = parseProductMessage(msg.content);

              return (
                <div
                  key={msg.id}
                  className={cn(
                    "flex w-full",
                    isMe ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] text-sm shadow-sm flex flex-col gap-1",
                      isMe
                        ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm"
                        : "bg-white border rounded-2xl rounded-tl-sm"
                    )}
                  >
                    {parsed.isProduct ? (
                      <div className="flex flex-col">
                        <div
                          className={cn(
                            "flex items-center gap-3 p-2 rounded-xl border relative mb-1",
                            isMe
                              ? "bg-primary-foreground/10 border-white/20"
                              : "bg-muted/30 border-muted-foreground/10"
                          )}
                        >
                          <Avatar
                            className={cn(
                              "h-10 w-10 rounded-lg border",
                              isMe
                                ? "border-white/20"
                                : "border-muted-foreground/10"
                            )}
                          >
                            <AvatarImage
                              src={parsed.image || undefined}
                              className="object-cover"
                            />
                            <AvatarFallback
                              className={cn(isMe ? "text-primary bg-white" : "")}
                            >
                              <ShoppingBag className="size-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold truncate leading-tight">
                              {parsed.name}
                            </p>
                            <p
                              className={cn(
                                "text-[10px] font-bold mt-0.5",
                                isMe ? "text-white/90" : "text-primary"
                              )}
                            >
                              Rp {parsed.price}
                            </p>
                          </div>
                        </div>
                        {parsed.additionalText && (
                          <p className="px-3 py-1 leading-relaxed whitespace-pre-wrap">
                            {parsed.additionalText}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="px-3 py-2 leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    )}
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-[9px] px-3 pb-1.5",
                        isMe
                          ? "text-primary-foreground/90 justify-end"
                          : "text-muted-foreground opacity-70 justify-end"
                      )}
                    >
                      <span>
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {isMe && (
                        <span>
                          {msg.is_read ? (
                            <CheckCheck className="size-3.5 text-blue-300" />
                          ) : (
                            <Check className="size-3.5 opacity-70" />
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

      {pendingProduct && (
        <div className="px-4 py-2 border-t bg-background animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 p-2 bg-muted/30 rounded-xl border relative">
            <Avatar className="h-10 w-10 rounded-lg border">
              <AvatarImage src={pendingProduct.image} className="object-cover" />
              <AvatarFallback>
                <Store className="size-4" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold truncate">
                {pendingProduct.name}
              </p>
              <p className="text-[10px] text-primary font-bold">
                Rp {pendingProduct.price.toLocaleString("id-ID")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full absolute -top-2 -right-2 bg-background border shadow-sm hover:text-destructive"
              onClick={onRemoveProduct}
            >
              <XCircle className="size-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="p-3 bg-background border-t shrink-0">
        <div className="flex gap-2 items-end bg-muted/50 p-1.5 rounded-3xl border">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ketik pesan..."
            className="border-none shadow-none focus-visible:ring-0 bg-transparent px-4"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() && !pendingProduct}
            className="rounded-full h-9 w-9"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// --- MAIN COMPONENT ---
interface FloatingChatProps {
  currentUserId: string;
  orgId?: string;
  storeName?: string;
  storeAvatar?: string;
  productId?: string;
  productName?: string;
  productImage?: string;
  productPrice?: number;
  customTrigger?: React.ReactNode;
}

export function FloatingChat({
  currentUserId,
  orgId,
  storeName,
  storeAvatar,
  productId,
  productName,
  productImage,
  productPrice,
  customTrigger,
}: FloatingChatProps) {
  const pathname = usePathname();

  // [FIX 1] Use stable useState for Supabase client (from Code A)
  const [supabase] = useState(() => createClient());

  const [open, setOpen] = useState(false);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [pendingProduct, setPendingProduct] = useState<any>(null);

  // [RESTORED] State for Rooms and Loading (from Code A)
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const [unreadCount, setUnreadCount] = useState(0);

  const isRestrictedPath =
    pathname.startsWith("/merchant") || pathname.startsWith("/admin");

  // [IMPLEMENTED] Stable Fetch Rooms Logic (from Code A)
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

  const refreshAllData = useCallback(async () => {
    if (!currentUserId) return;

    // Fetch Unread Count
    const count = await getUnreadCount("buyer", currentUserId);
    setUnreadCount(count || 0);

    // Fetch Rooms List
    await fetchRooms();
  }, [currentUserId, fetchRooms]);

  // 1. Initial Load
  useEffect(() => {
    if (!currentUserId || isRestrictedPath) return;
    refreshAllData();
  }, [currentUserId, isRestrictedPath, refreshAllData]);

  // 2. Refresh when ActiveRoom changes (to update unread status in list)
  useEffect(() => {
    if (!loading && rooms.length > 0) {
      // Re-fetch logic from Code A to clear unread markers in list
      fetchRooms();
    }
    // Also update global badge count
    getUnreadCount("buyer", currentUserId).then((c) => setUnreadCount(c || 0));
  }, [activeRoom?.id, currentUserId, fetchRooms, loading, rooms.length]);

  // 3. REALTIME LISTENER (Global Logic from Code A)
  useEffect(() => {
    if (!currentUserId || isRestrictedPath) return;

    const channel = supabase
      .channel("buyer_global_chat_listener")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
        },
        () => {
          console.log("🔔 Realtime Buyer: New activity detected!");
          refreshAllData();
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Chat List Connected to Realtime");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, isRestrictedPath, supabase, refreshAllData]);

  const handleOpenChange = async (val: boolean) => {
    setOpen(val);
    if (val && orgId && storeName) {
      // Logic for Direct Store Chat
      if (productId && productName) {
        setPendingProduct({
          id: productId,
          name: productName,
          image: productImage,
          price: productPrice,
        });
      }

      const res = await startBuyerChat(orgId);

      if (res.roomId) {
        setActiveRoom({
          id: res.roomId,
          otherPartyName: storeName,
          otherPartyImage: storeAvatar || null,
          lastMessage: "",
          updatedAt: new Date().toISOString(),
          unreadCount: 0,
        });
        await refreshAllData();
      }
    } else if (val) {
      // Just opening list -> Refresh data
      await refreshAllData();
    } else if (!val) {
      setActiveRoom(null);
      setPendingProduct(null);
    }
  };

  if (!currentUserId || isRestrictedPath) return null;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {customTrigger ? (
          customTrigger
        ) : (
          <div className="fixed bottom-6 right-6 z-50">
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-xl p-0 transition-all bg-primary hover:scale-105"
            >
              <MessageCircle className="size-7 fill-white text-white" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-5 w-5 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                </span>
              )}
            </Button>
          </div>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[400px] p-0 flex flex-col">
        <div className="px-4 py-3 border-b bg-muted/20">
          <SheetTitle className="text-base font-bold flex items-center gap-2">
            <Store className="size-4 text-primary" />
            {activeRoom ? "Chat Toko" : "Pesan Masuk"}
          </SheetTitle>
        </div>
        <div className="flex-1 min-h-0 bg-background">
          {activeRoom ? (
            <ActiveChatView
              room={activeRoom}
              currentUserId={currentUserId}
              pendingProduct={pendingProduct}
              onRemoveProduct={() => setPendingProduct(null)}
              onBack={() => setActiveRoom(null)}
              onMessageSent={() => {
                setPendingProduct(null);
                refreshAllData();
              }}
            />
          ) : (
            // [IMPLEMENTED] Passing dynamic data to ChatList
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