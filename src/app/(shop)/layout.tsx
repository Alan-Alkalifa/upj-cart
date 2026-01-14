// src/app/(shop)/layout.tsx
import { createClient } from "@/utils/supabase/server"; 
import { Navbar } from "@/components/shop/navbar"; 
import { Footer } from "@/components/shop/footer"; 
import { FloatingChatWidget } from "@/components/chat/floating-chat";

// Metadata bisa ditambahkan di sini untuk SEO
export const metadata = {
  title: "Bemlanja - Shopping for UPJ Academic Community Products",
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

  // 3. Inject Role & Profile info (Avatar, Name) agar Navbar bisa menampilkan data terbaru
  let userWithProfile = null;
  if (user) {
     // Kita ambil role, avatar_url, dan full_name dari tabel profiles
     const { data: profile } = await supabase
       .from('profiles')
       .select('role, avatar_url, full_name')
       .eq('id', user.id)
       .single();
     
     // Gabungkan data user auth dengan data dari DB profiles
     // Navbar akan memprioritaskan properti di top-level (dari DB) daripada user_metadata
     userWithProfile = { 
       ...user, 
       role: profile?.role,
       avatar_url: profile?.avatar_url,
       full_name: profile?.full_name
     };
  }

  return (
    <div className="flex min-h-screen flex-col bg-background relative">
      <Navbar user={userWithProfile} cartCount={cartCount} />
      
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