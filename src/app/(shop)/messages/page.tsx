import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { BuyerMessagesClient } from "./messages-client";

export default async function BuyerMessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/messages");
  }

  return (
    <div className="w-full h-[calc(100dvh-5rem)] md:h-[calc(100vh-2rem)] flex flex-col">
      <BuyerMessagesClient currentUserId={user.id} />
    </div>
  );
}
