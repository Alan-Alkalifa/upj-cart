"use client"

import { useState, createContext, useContext } from "react"
import { Tabs } from "@/components/ui/tabs"

// 1. Buat Context
const ShopTabsContext = createContext<{
  activeTab: string
  setActiveTab: (v: string) => void
} | null>(null)

// 2. Custom Hook untuk menggunakan Context
export function useShopTabs() {
  const ctx = useContext(ShopTabsContext)
  if (!ctx) throw new Error("useShopTabs must be used within ShopTabsWrapper")
  return ctx
}

// 3. Component Wrapper
interface ShopTabsWrapperProps {
  defaultTab?: string
  children: React.ReactNode
  className?: string
}

export function ShopTabsWrapper({ 
  defaultTab = "products", 
  children,
  className 
}: ShopTabsWrapperProps) {
  // Kita kontrol state tab di sini
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <ShopTabsContext.Provider value={{ activeTab, setActiveTab }}>
      <Tabs value={activeTab} onValueChange={setActiveTab} className={className}>
        {children}
      </Tabs>
    </ShopTabsContext.Provider>
  )
}