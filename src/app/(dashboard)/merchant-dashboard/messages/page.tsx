import { createClient } from "@/utils/supabase/server";
import { AdminMessagesClient } from "./messages-client"; // Updated import
import { redirect } from "next/navigation";

export default async function MerchantMessagesPage() { // Function name can remain or change to AdminMessagesPage
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <div className="max-w-full h-[calc(100dvh-5rem)] md:h-[calc(100vh-2rem)] flex flex-col">
       <AdminMessagesClient currentUserId={user.id} />
    </div>
  );
}