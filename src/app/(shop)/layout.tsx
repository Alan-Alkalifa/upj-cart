import { createClient } from "@/utils/supabase/server"; //
import { Navbar } from "@/components/shop/navbar"; //
import { Footer } from "@/components/shop/footer"; //
import { FloatingChatWidget } from "@/components/chat/floating-chat";

// Metadata bisa ditambahkan di sini untuk SEO
export const metadata = {
  title: "UPJ Cart - Shopping for UPJ Academic Community Products",
  description: "Official Marketplace Universitas Pembangunan Jaya.",
}

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient();
  
  // 1. Ambil User Session
  const { data: { user } } = await supabase.auth.getUser();

  // 2. Ambil Jumlah Cart (Untuk Badge di Navbar)
  let cartCount = 0;
  if (user) {
    const { count } = await supabase
      .from("carts")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);
    cartCount = count || 0;
  }

  // 3. Inject Role info agar Navbar tahu user ini Merchant/Admin atau bukan
  let userWithRole = null;
  if (user) {
     // Kita ambil role dari tabel profiles untuk memastikan data terbaru
     const { data: profile } = await supabase
       .from('profiles')
       .select('role')
       .eq('id', user.id)
       .single();
     
     // Gabungkan data user auth dengan role dari DB
     userWithRole = { 
       ...user, 
       role: profile?.role 
     };
  }

  return (
    <div className="flex min-h-screen flex-col bg-background relative">
      <Navbar user={userWithRole} cartCount={cartCount} />
      
      <main className="flex-1 w-full">
        {children}
      </main>
      
      <Footer />

      {/* Floating Chat Widget - Only visible if user is logged in */}
      {user && (
        <FloatingChatWidget currentUserId={user.id} />
      )}
    </div>
  );
}