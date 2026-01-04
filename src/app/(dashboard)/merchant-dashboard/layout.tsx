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
import { getPlatformSettings } from "@/utils/get-settings" //
import { redirect } from "next/navigation"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  // 1. Ambil Data User & Settings Platform secara Parallel
  const [{ data: { user } }, settings] = await Promise.all([
    supabase.auth.getUser(),
    getPlatformSettings() // Mengambil platform_name & support_email
  ])

  if (!user) redirect("/login")

  // 2. Ambil Data Organisasi
  const { data: memberData } = await supabase 
    .from("organization_members")
    .select("*, organizations(*)")
    .eq("profile_id", user.id)
    .maybeSingle()

  if (!memberData) {
    redirect("/") 
  }

  const org = memberData.organizations
  
  // 3. Status Check (Sekarang menyertakan 'suspended')
  const isRestricted = org.status === 'pending' || org.status === 'rejected' || org.status === 'suspended'

  return (
    <SidebarProvider>
      <AppSidebar user={user} org={org} />
      
      <SidebarInset>
        {/* Perbaikan class tailwind sesuai saran linter */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
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
                    {org?.status === 'suspended' && (
                      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Suspended
                      </span>
                    )}
                    {org?.status === 'rejected' && (
                      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        Rejected
                      </span>
                    )}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4 mt-4 pt-0">
          {/* Mengirimkan data settings ke RestrictedView untuk memperbaiki error TS2741 */}
          {isRestricted ? (
            <RestrictedView 
              status={org.status} 
              settings={{
                platform_name: settings.platform_name,
                support_email: settings.support_email
              }} 
            />
          ) : (
            children
          )}
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}