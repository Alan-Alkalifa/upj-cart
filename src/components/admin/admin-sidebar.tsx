"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Store,
  Package,
  Users,
  Settings,
  LogOut,
  ShieldCheck,
  ChevronsUpDown,
  Wallet,
  MessageCircle,
  LineChart, // [NEW] Import icon untuk Analytics
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { SidebarBadge } from "@/components/dashboard/sidebar-badge"

export function AppSidebar({ user }: { user: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { isMobile } = useSidebar()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    toast.success("Logged out successfully")
    router.push("/login")
  }

  return (
    <Sidebar collapsible="icon">
      {/* --- HEADER --- */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <ShieldCheck className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Bemlanja</span>
                <span className="truncate text-xs">Super Admin</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* --- GROUP 1: PLATFORM MANAGE --- */}
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/admin-dashboard"} tooltip="Overview">
                <a href="/admin-dashboard">
                  <LayoutDashboard />
                  <span>Overview</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/admin-dashboard/merchants")} tooltip="Merchants">
                <a href="/admin-dashboard/merchants">
                  <Store />
                  <span>Merchants</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/admin-dashboard/products")} tooltip="Products">
                <a href="/admin-dashboard/products">
                  <Package />
                  <span>Products</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/admin-dashboard/users")} tooltip="Users">
                <a href="/admin-dashboard/users">
                  <Users />
                  <span>Users</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* --- GROUP 2: MONITORING & SUPPORT --- */}
        <SidebarGroup>
          <SidebarGroupLabel>Monitoring</SidebarGroupLabel>
          <SidebarMenu>
            
            {/* [NEW] MENU ANALYTICS */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/admin-dashboard/analytics")} tooltip="Analytics">
                <a href="/admin-dashboard/analytics">
                  <LineChart />
                  <span>Analytics</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/admin-dashboard/finance")} tooltip="Finance">
                <a href="/admin-dashboard/finance">
                  <Wallet />
                  <span>Finance</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>

            {/* MESSAGES WITH BADGE */}
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/admin-dashboard/messages")} tooltip="Messages">
                <a href="/admin-dashboard/messages" className="flex items-center w-full">
                  <MessageCircle />
                  <span className="flex-1">Messages</span>
                  <SidebarBadge role="admin" />
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        {/* --- GROUP 3: CONFIGURATION --- */}
        <SidebarGroup>
          <SidebarGroupLabel>Configuration</SidebarGroupLabel>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname.startsWith("/admin-dashboard/settings")} tooltip="Settings">
                <a href="/admin-dashboard/settings">
                  <Settings />
                  <span>Settings</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      {/* --- FOOTER --- */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">SA</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{user?.email || "Admin"}</span>
                    <span className="truncate text-xs">Active</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}