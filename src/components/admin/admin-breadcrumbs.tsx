"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

// 1. Definisikan tipe props agar TypeScript tidak error
interface BreadcrumbItemType {
  label: string
  href: string
  active?: boolean
}

interface AdminBreadcrumbsProps {
  items?: BreadcrumbItemType[] // Opsional: Bisa dipakai, bisa tidak
}

export function AdminBreadcrumbs({ items }: AdminBreadcrumbsProps) {
  const pathname = usePathname()

  // 2. LOGIKA BARU: Jika props 'items' ada, render berdasarkan items (Manual Mode)
  if (items && items.length > 0) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <React.Fragment key={item.href}>
                <BreadcrumbItem className={!item.active && !isLast ? "hidden md:block" : ""}>
                  {item.active || isLast ? (
                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={item.href}>{item.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && <BreadcrumbSeparator className="hidden md:block" />}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>
    )
  }

  // 3. LOGIKA LAMA (EXISTING): Auto-generate dari URL (Automatic Mode)
  // Ini tetap berjalan jika komponen dipanggil tanpa props <AdminBreadcrumbs />
  
  // Split path into segments and remove empty strings
  const segments = pathname.split("/").filter(Boolean)

  // Mapping technical paths to readable labels
  const routeLabels: Record<string, string> = {
    admin: "Super Admin",
    merchants: "Merchants",
    products: "Products",
    users: "Users",
    finance: "Finance",
    messages: "Messages",
    settings: "Settings",
    analytics: "Analytics", // Tambahkan analytics agar rapi jika mode auto dipakai
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join("/")}`
          const isLast = index === segments.length - 1
          const label = routeLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem className={!isLast ? "hidden md:block" : ""}>
                {isLast ? (
                  <BreadcrumbPage>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={href}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className="hidden md:block" />
              )}
            </React.Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}