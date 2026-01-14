// src/components/shop/navbar.tsx
"use client"

import Link from "next/link"
import { useRouter, usePathname } from "next/navigation" 
import { ShoppingCart, Search, Store, LayoutDashboard, User, LogOut, Package } from "lucide-react"
import { toast } from "sonner"
import { ShopSearch } from "@/components/shop/shop-search" 

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
  const pathname = usePathname()
  
  const userRole = user?.app_metadata?.role || user?.role
  
  // Determine display values (prioritize profile table data over auth metadata)
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url
  const fullName = user?.full_name || user?.user_metadata?.full_name || "Pengguna"
  const email = user?.email
  const initial = (fullName?.[0] || email?.[0] || "U").toUpperCase()

  // Restricted users (Admin & Merchant) still cannot see the Cart
  const isRestrictedUser = userRole === 'super_admin' || userRole === 'merchant'
  
  // Logic to hide search bar
  const isSearchHidden = pathname === '/search' || pathname?.startsWith('/merchant-dashboard/')

  const handleLogout = async () => {
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      toast.error("Failed to logout: " + error.message)
    } else {
      toast.success("Successfully logged out!")
      window.location.href = "/login"
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* 1. LOGO */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-lg group-hover:bg-primary/90 transition-colors">
              <Store className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl hidden sm:inline-block tracking-tight">Bemlanja</span>
          </Link>
        </div>

        {/* 2. SEARCH BAR (Desktop) - Conditional Rendering */}
        {!isSearchHidden && (
          <div className="flex-1 max-w-xl hidden md:block">
            <ShopSearch baseUrl="/search" />
          </div>
        )}

        {/* 3. ACTIONS */}
        <div className="flex items-center gap-1 sm:gap-2">
          
          {/* Mobile Search - Conditional */}
          {!isSearchHidden && (
            <Button variant="ghost" size="icon" className="md:hidden" onClick={() => router.push('/search')}>
               <Search className="h-5 w-5" />
            </Button>
          )}

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
                    <AvatarImage src={avatarUrl} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {initial}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none truncate">
                      {fullName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {email}
                    </p>
                    {isRestrictedUser && (
                        <Badge variant="outline" className="w-fit mt-1 text-[10px] h-5 px-1">
                          {userRole === 'super_admin' ? 'Admin' : 'Merchant'}
                        </Badge>
                    )}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                
                {!isRestrictedUser && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link href="/profiles" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/orders" className="cursor-pointer">
                        <Package className="mr-2 h-4 w-4" /> Orders
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}

                {isRestrictedUser && (
                    <>
                      <DropdownMenuItem asChild>
                        <Link 
                          href={userRole === 'super_admin' ? "/admin-dashboard" : "/merchant-dashboard"} 
                          className="cursor-pointer font-medium"
                        >
                          <LayoutDashboard className="mr-2 h-4 w-4" /> 
                          {userRole === 'super_admin' ? "Dashboard Admin" : "Dashboard Merchant"}
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                )}

                <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                  <LogOut className="mr-2 h-4 w-4" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/register">Register</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/login">Login</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}