"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ShoppingCart, Search, Menu, User, LogOut, Package, Store, LayoutDashboard } from "lucide-react"
import { toast } from "sonner" // 1. IMPORT TOAST

// UI Components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/utils/supabase/client"

interface NavbarProps {
  user: any
  cartCount?: number
}

export function Navbar({ user, cartCount = 0 }: NavbarProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  // --- LOGIKA ROLE ---
  const userRole = user?.app_metadata?.role || user?.role
  const isRestrictedUser = userRole === 'super_admin' || userRole === 'merchant'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  // 2. UPDATE FUNGSI LOGOUT
  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error("Gagal keluar: " + error.message)
    } else {
      toast.success("Berhasil Logout!") // Tampilkan Toast Sukses
      router.refresh()
      router.push("/login")
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* 1. LOGO & MOBILE MENU */}
        <div className="flex items-center gap-2">
          {/* Mobile Sidebar */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle className="text-left flex items-center gap-2">
                  <Store className="h-5 w-5" /> Menu
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-4 mt-6">
                <Link href="/" className="text-sm font-medium hover:text-primary transition-colors">Beranda</Link>
                
                {/* Menu Khusus Buyer (Mobile) */}
                {!isRestrictedUser && (
                   <Link href="/search" className="text-sm font-medium hover:text-primary transition-colors">Semua Produk</Link>
                )}

                {/* Menu Khusus Admin/Merchant (Mobile) */}
                {isRestrictedUser && (
                  <Link href={userRole === 'super_admin' ? "/admin" : "/merchant"} className="text-sm font-medium text-blue-600">
                    Dashboard
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
          
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:bg-primary/90 transition-colors">
              <Store className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl hidden sm:inline-block tracking-tight">UPJ Cart</span>
          </Link>
        </div>

        {/* 2. SEARCH BAR (Desktop) */}
        {!isRestrictedUser && (
          <form onSubmit={handleSearch} className="flex-1 max-w-xl relative hidden md:flex items-center">
            <Input 
              placeholder="Cari produk mahasiswa..." 
              className="pr-10 rounded-full bg-muted/50 focus-visible:bg-background transition-colors" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button 
              type="submit" 
              size="icon" 
              variant="ghost" 
              className="absolute right-1 h-8 w-8 rounded-full hover:bg-transparent text-muted-foreground"
            >
              <Search className="h-4 w-4" />
            </Button>
          </form>
        )}

        {/* 3. ACTIONS */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* Mobile Search - Hide for Admin/Merchant */}
          {!isRestrictedUser && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/search')}>
               <Search className="h-5 w-5" />
            </Button>
          )}

          {/* Cart Icon - Hide for Admin/Merchant */}
          {!isRestrictedUser && (
            <Button asChild variant="ghost" size="icon" className="relative">
              <Link href="/cart">
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] ring-2 ring-background" 
                    variant="destructive"
                  >
                    {cartCount}
                  </Badge>
                )}
              </Link>
            </Button>
          )}

          {/* User Dropdown */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full ml-1">
                  <Avatar className="h-8 w-8 border">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {user.email?.[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">
                      {user.user_metadata?.full_name || "Pengguna"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user.email}
                    </p>
                    {isRestrictedUser && (
                       <Badge variant="outline" className="w-fit mt-1 text-[10px] h-5 px-1">
                         {userRole === 'super_admin' ? 'Admin' : 'Merchant'}
                       </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {/* --- MENU BUYER --- */}
                {!isRestrictedUser && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" /> Akun Saya
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="cursor-pointer">
                        <Package className="mr-2 h-4 w-4" /> Pesanan Saya
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {/* --- MENU MERCHANT/ADMIN --- */}
                {isRestrictedUser && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link 
                          href={userRole === 'super_admin' ? "/admin" : "/merchant"} 
                          className="cursor-pointer font-medium text-blue-600 focus:text-blue-600 focus:bg-blue-50"
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" /> 
                          {userRole === 'super_admin' ? "Dashboard Admin" : "Dashboard Toko"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                )}

                {/* LOGOUT BUTTON */}
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" /> Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/register">Daftar</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">Masuk</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}