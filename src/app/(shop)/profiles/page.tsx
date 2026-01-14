import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { ProfileForm } from "./profile-form";
import { AddressManager } from "./address-manager";
import { Separator } from "@/components/ui/separator";

export const metadata = {
  title: "My Profile | Bemlanja",
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch Profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch Addresses
  const { data: addresses } = await supabase
    .from("user_addresses")
    .select("*")
    .eq("user_id", user.id)
    .order("is_default", { ascending: false }) // Default first
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Profile & Settings</h1>
          <p className="text-muted-foreground">
            Manage your personal information and shipping addresses.
          </p>
        </div>
        
        <Separator />

        <div className="grid gap-8 md:grid-cols-[1fr_2fr]">
          {/* Left Column: Navigation or simple user summary could go here */}
          <div className="space-y-6">
             <div className="p-4 border rounded-lg bg-muted/20">
                <h3 className="font-semibold mb-2">Account Info</h3>
                <p className="text-sm text-muted-foreground break-all">{user.email}</p>
                <div className="mt-2 text-xs bg-primary/10 text-primary px-2 py-1 rounded w-fit capitalize">
                  {profile?.role || "User"}
                </div>
             </div>
          </div>

          {/* Right Column: Forms */}
          <div className="space-y-8">
            <section id="personal-info">
              <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
              <ProfileForm profile={profile} />
            </section>

            <Separator />

            <section id="addresses">
              <h2 className="text-xl font-semibold mb-4">Address Book</h2>
              <AddressManager initialAddresses={addresses || []} />
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}