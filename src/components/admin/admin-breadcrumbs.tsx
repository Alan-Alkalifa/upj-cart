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

export function AdminBreadcrumbs() {
  const pathname = usePathname()
  
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