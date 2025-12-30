import { createClient } from "@/utils/supabase/server";
import { MerchantMessagesClient } from "./messages-client";
import { redirect } from "next/navigation";

export default async function AdminMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    // Fixed height container for consistent scrolling layout
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] flex flex-col">
       <MerchantMessagesClient currentUserId={user.id} />
    </div>
  );
}