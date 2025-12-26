import { createClient } from "@/utils/supabase/server";
import { MerchantMessagesClient } from "./messages-client";
import { redirect } from "next/navigation";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] flex flex-col">
       {/* Height Calculation: 
         - 100vh: Full viewport height
         - 4rem/2rem: Adjusts for Navbar/Sidebar offsets to prevent double scrollbars
       */}
       <MerchantMessagesClient currentUserId={user.id} />
    </div>
  );
}