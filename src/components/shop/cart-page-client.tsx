"use client"

import { useState, useEffect } from "react"
import { CartClient } from "@/components/shop/cart-client"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Store, ArrowRight, ShieldCheck, ShoppingBag } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
// [ANALYTICS] Import Helper
import { trackEvent } from "@/lib/analytics"

// Helper untuk unwrap data array/object dari Supabase
const unwrap = (data: any) => Array.isArray(data) ? data[0] : data

export function CartPageClient({ cartItems }: { cartItems: any[] }) {
  const router = useRouter()
  
  // State: Menyimpan ID cart_item yang dipilih
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // GROUPING LOGIC
  const groupedCart: Record<string, any> = {}
  cartItems.forEach((item: any) => {
    const variant = unwrap(item.product_variants)
    const product = variant ? unwrap(variant.products) : null
    const org = product ? unwrap(product.organizations) : null
    
    if (!variant || !product || !org) return

    // Normalized Item Structure
    const normalizedItem = {
      ...item,
      product_variants: {
        ...variant,
        products: {
          ...product,
          organizations: org
        }
      }
    }

    const orgId = org.id
    if (!groupedCart[orgId]) {
      groupedCart[orgId] = { organization: org, items: [] }
    }
    groupedCart[orgId].items.push(normalizedItem)
  })

  // [ANALYTICS] 1. Track View Cart saat halaman dimuat
  useEffect(() => {
    if (cartItems.length > 0) {
      // Hitung total value cart
      const totalCartValue = cartItems.reduce((acc, i) => {
        const v = unwrap(i.product_variants);
        const p = v?.products;
        const price = v?.price_override || p?.base_price || 0;
        return acc + (price * i.quantity);
      }, 0);

      // Helper analytics akan mengurus unwrap data untuk GA4
      trackEvent.viewCart(cartItems, totalCartValue);
    }
  }, [cartItems]);

  // HELPER: Toggle per Item
  const toggleItem = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(i => i !== id))
    }
  }

  // HELPER: Toggle per Toko
  const toggleStore = (items: any[], checked: boolean) => {
    const ids = items.map(i => i.id)
    if (checked) {
      // Tambahkan semua ID dari toko ini yang belum ada di state
      setSelectedIds(prev => [...new Set([...prev, ...ids])])
    } else {
      // Hapus semua ID dari toko ini
      setSelectedIds(prev => prev.filter(i => !ids.includes(i)))
    }
  }

  // HELPER: Toggle Semua
  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(cartItems.map(i => i.id))
    } else {
      setSelectedIds([])
    }
  }

  // HITUNG TOTAL (Hanya yang dipilih)
  const selectedItems = cartItems.filter(i => selectedIds.includes(i.id))
  const totalPrice = selectedItems.reduce((acc, i) => {
    const variant = unwrap(i.product_variants)
    const product = variant ? unwrap(variant.products) : null
    const price = variant.price_override || product.base_price
    return acc + (price * i.quantity)
  }, 0)
  const totalQty = selectedItems.reduce((acc, i) => acc + i.quantity, 0)

  // Empty State
  if (cartItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-24 flex flex-col items-center justify-center text-center max-w-md">
        <div className="bg-muted p-8 rounded-full mb-6 animate-in zoom-in duration-500">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/50" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Keranjang Belanja Kosong</h2>
        <Button asChild size="lg" className="rounded-full px-8 mt-4">
          <Link href="/search">Mulai Belanja</Link>
        </Button>
      </div>
    )
  }

  const handleCheckout = () => {
    // [ANALYTICS] 2. Track Begin Checkout
    // Kirim data hanya item yang DIPILIH (selectedItems)
    trackEvent.beginCheckout(selectedItems, totalPrice);

    // Redirect ke checkout dengan membawa ID items yang dipilih
    router.push(`/checkout?items=${selectedIds.join(',')}`)
  }

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 bg-muted/5 min-h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold mb-8">Keranjang Belanja</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        
        {/* Left: Cart Items List */}
        <div className="space-y-6">
          
          {/* Header Pilih Semua */}
          <div className="bg-card border rounded-xl px-6 py-4 flex items-center gap-3 shadow-sm">
             <Checkbox 
               id="select-all" 
               checked={selectedIds.length === cartItems.length && cartItems.length > 0}
               onCheckedChange={(checked) => toggleAll(checked as boolean)}
             />
             <label htmlFor="select-all" className="font-medium cursor-pointer select-none">Pilih Semua ({cartItems.length})</label>
          </div>

          {Object.values(groupedCart).map((group: any) => {
            const allSelectedInStore = group.items.every((i: any) => selectedIds.includes(i.id))
            
            return (
              <div key={group.organization.id} className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="bg-muted/30 px-6 py-4 border-b flex items-center gap-3">
                  <Checkbox 
                    checked={allSelectedInStore}
                    onCheckedChange={(checked) => toggleStore(group.items, checked as boolean)}
                  />
                  <Store className="h-4 w-4 text-primary ml-1" />
                  <Link href={`/shop/${group.organization.slug}`} className="font-semibold text-sm hover:underline hover:text-primary transition-colors">
                    {group.organization.name}
                  </Link>
                </div>
                <div className="divide-y divide-border/50">
                  {group.items.map((item: any) => (
                    <CartClient 
                      key={item.id} 
                      item={item} 
                      isSelected={selectedIds.includes(item.id)}
                      onToggle={(checked) => toggleItem(item.id, checked)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right: Summary Sticky */}
        <div className="h-fit lg:sticky lg:top-24 space-y-4">
          <div className="border rounded-xl p-6 bg-card shadow-sm space-y-6">
            <h3 className="font-semibold text-lg">Ringkasan Belanja</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Total Item Dipilih</span>
                <span>{totalQty} items</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Harga</span>
                <span>Rp {totalPrice.toLocaleString("id-ID")}</span>
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-end">
              <span className="font-bold text-base">Total Tagihan</span>
              <span className="font-bold text-2xl text-primary">
                Rp {totalPrice.toLocaleString("id-ID")}
              </span>
            </div>

            <Button 
              className="w-full text-base py-6 font-bold shadow-lg shadow-primary/20" 
              size="lg" 
              disabled={selectedIds.length === 0}
              onClick={handleCheckout}
            >
              Checkout <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span>Pembayaran aman & terpercaya</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}