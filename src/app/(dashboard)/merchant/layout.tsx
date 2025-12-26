import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { RestrictedView } from "@/components/dashboard/restricted-view"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: memberData } = await supabase 
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (!memberData) {
    redirect("/") 
  }

  const org = memberData.organizations
  
  // 3. Status Check
  const isRestricted = org.status === 'pending' || org.status === 'rejected'

  return (
    <SidebarProvider>
      <AppSidebar user={user} org={org} />
      
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="font-semibold flex items-center gap-2">
                    {org?.name || "Dashboard"}
                    
                    {org?.status === 'pending' && (
                      <span className="inline-flex items-center rounded-full border border-yellow-200 bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                        Pending Verification
                      </span>
                    )}
                    {org?.status === 'rejected' && (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        Suspended
                      </span>
                    )}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 mt-4 pt-0">
          {/* 🔴 INTERCEPT CONTENT HERE */}
          {isRestricted ? (
            <RestrictedView status={org.status} />
          ) : (
            children
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}