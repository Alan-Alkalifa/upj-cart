"use client";

import { useState } from "react";
import { LifeBuoy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { startAdminChat } from "@/app/actions/chat"; //
import { useRouter } from "next/navigation";
import { toast } from "sonner"; //

export function SupportChatButton({ 
  orgId, 
  currentUserId 
}: { 
  orgId: string; 
  currentUserId: string 
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleOpenSupport = async () => {
    setLoading(true);
    try {
      // 1. Get or Create the Room ID
      const res = await startAdminChat(orgId);
      
      if (res.error) {
        toast.error(res.error);
      } else if (res.roomId) {
        // 2. Redirect to Messages Page with the ID
        router.push(`/merchant/messages?id=${res.roomId}`);
      }
    } catch (error) {
      toast.error("Gagal membuka tiket support");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleOpenSupport} 
      variant="outline" 
      className="w-full justify-start gap-2 bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
      disabled={loading}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : <LifeBuoy className="size-4" />}
      Hubungi Admin (Support)
    </Button>
  );
}