"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getUnreadCount } from "@/app/actions/notifications";
import { Badge } from "@/components/ui/badge";

export function SidebarBadge({ 
  role, 
  orgId 
}: { 
  role: 'merchant' | 'admin', 
  orgId?: string 
}) {
  const [count, setCount] = useState(0);
  const supabase = createClient();

  const refreshCount = async () => {
    const total = await getUnreadCount(role, orgId);
    setCount(total);
  };

  useEffect(() => {
    // 1. Initial Fetch
    refreshCount();

    // 2. Realtime Listener
    // We listen to ANY change in chat_messages table to trigger a re-count.
    // This is simple and effective.
    const channel = supabase
      .channel('global_notifications')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT (new msg) and UPDATE (read status)
          schema: 'public',
          table: 'chat_messages'
        },
        () => {
          refreshCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [role, orgId]);

  if (count === 0) return null;

  return (
    <Badge 
      variant="destructive" 
      className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] px-1"
    >
      {count > 99 ? '99+' : count}
    </Badge>
  );
}