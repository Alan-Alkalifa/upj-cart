"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { startBuyerChat } from "@/app/actions/chat";

interface ChatMerchantButtonProps {
  orgId: string;
  isRestricted?: boolean;
}

export function ChatMerchantButton({ orgId, isRestricted }: ChatMerchantButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChat = async () => {
    // 1. Prevent restricted users (Admins/Merchants)
    if (isRestricted) {
      toast.error("Akses Dibatasi", {
        description: "Akun Merchant/Admin tidak dapat memulai chat sebagai pembeli."
      });
      return;
    }

    setIsLoading(true);

    try {
      // 2. Call Server Action to create/get room
      const result = await startBuyerChat(orgId);

      if (result.error) {
        if (result.error === "Unauthorized") {
          toast.error("Login Diperlukan", { description: "Silakan login untuk chat dengan penjual." });
          router.push("/login");
        } else {
          toast.error("Gagal Memulai Chat", { description: result.error });
        }
        return;
      }

      // 3. Dispatch Custom Event to open FloatingChatWidget
      // This event will be caught by src/components/chat/floating-chat.tsx
      const event = new CustomEvent("open-chat-room", { 
        detail: { roomId: result.roomId } 
      });
      window.dispatchEvent(event);

      // 4. Feedback
      toast.success("Membuka Chat...", {
        duration: 1500,
      });
      
    } catch (error) {
      toast.error("Terjadi Kesalahan", { description: "Gagal menghubungkan ke server." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleChat} 
      disabled={isLoading}
      className="w-full sm:w-auto border-primary/20 hover:bg-primary/5 hover:text-primary transition-colors"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4 mr-2" />
      )}
      Chat Penjual
    </Button>
  );
}