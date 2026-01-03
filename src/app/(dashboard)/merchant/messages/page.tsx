import { createClient } from "@/utils/supabase/server";
import { MerchantMessagesClient } from "./messages-client";
import { redirect } from "next/navigation";

export default async function MerchantMessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-full h-[calc(100dvh-5rem)] md:h-[calc(100vh-2rem)] flex flex-col">
       <MerchantMessagesClient currentUserId={user.id} />
    </div>
  );
}