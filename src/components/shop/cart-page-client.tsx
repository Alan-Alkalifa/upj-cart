"use client"

import { useState, useEffect } from "react"
import { CartClient } from "@/components/shop/cart-client"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Store, ArrowRight, ShieldCheck, ShoppingBag, TicketPercent, Loader2, X } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { validateCoupon } from "./actions" 
import { trackEvent } from "@/lib/analytics"

// Helper to unwrap Supabase data
const unwrap = (data: any) => Array.isArray(data) ? data[0] : data

export function CartPageClient({ cartItems }: { cartItems: any[] }) {
  const router = useRouter()
  
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string; 
    discount_percent: number; 
    org_id: string; 
    id: string
  } | null>(null)
  
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false)
  const [isCheckingOut, setIsCheckingOut] = useState(false) // NEW: Checkout Loading State

  // GROUPING LOGIC
  const groupedCart: Record<string, any> = {}
  cartItems.forEach((item: any) => {
    const variant = unwrap(item.product_variants)
    const product = variant ? unwrap(variant.products) : null
    const org = product ? unwrap(product.organizations) : null
    
    if (!variant || !product || !org) return

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

  // ANALYTICS
  useEffect(() => {
    if (cartItems.length > 0) {
      const totalCartValue = cartItems.reduce((acc, i) => {
        const v = unwrap(i.product_variants);
        const p = v?.products;
        const price = v?.price_override || p?.base_price || 0;
        return acc + (price * i.quantity);
      }, 0);
      trackEvent.viewCart(cartItems, totalCartValue);
    }
  }, [cartItems]);

  // TOGGLE HANDLERS
  const toggleItem = (id: string, checked: boolean) => {
    if (checked) setSelectedIds(prev => [...prev, id])
    else setSelectedIds(prev => prev.filter(i => i !== id))
  }

  const toggleStore = (items: any[], checked: boolean) => {
    const ids = items.map(i => i.id)
    if (checked) setSelectedIds(prev => [...new Set([...prev, ...ids])])
    else setSelectedIds(prev => prev.filter(i => !ids.includes(i)))
  }

  const toggleAll = (checked: boolean) => {
    if (checked) setSelectedIds(cartItems.map(i => i.id))
    else setSelectedIds([])
  }

  // CALCULATION LOGIC
  const selectedItems = cartItems.filter(i => selectedIds.includes(i.id))
  
  const subTotalPrice = selectedItems.reduce((acc, i) => {
    const variant = unwrap(i.product_variants)
    const product = variant ? unwrap(variant.products) : null
    const price = variant.price_override || product.base_price
    return acc + (price * i.quantity)
  }, 0)
  
  const totalQty = selectedItems.reduce((acc, i) => acc + i.quantity, 0)

  const discountAmount = appliedCoupon ? selectedItems.reduce((acc, i) => {
    const variant = unwrap(i.product_variants)
    const product = variant ? unwrap(variant.products) : null
    const org = product ? unwrap(product.organizations) : null
    
    if (org && org.id === appliedCoupon.org_id) {
       const price = variant.price_override || product.base_price
       return acc + (price * i.quantity)
    }
    return acc
  }, 0) * (appliedCoupon.discount_percent / 100) : 0

  const finalTotalPrice = subTotalPrice - discountAmount

  // COUPON HANDLERS
  const handleApplyCoupon = async () => {
    if (!couponCode) return
    if (selectedIds.length === 0) {
      toast.error("Pilih produk terlebih dahulu")
      return
    }

    setIsCheckingCoupon(true)
    const res = await validateCoupon(couponCode, selectedIds)
    setIsCheckingCoupon(false)

    if (res.error) {
      toast.error("Gagal menggunakan kupon", { description: res.error })
      setAppliedCoupon(null)
    } else if (res.success && res.coupon) {
      toast.success("Kupon berhasil dipasang!", { description: `Potongan ${res.coupon.discount_percent}% untuk produk terkait.` })
      setAppliedCoupon(res.coupon)
    }
  }

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    toast.info("Kupon dilepas")
  }

  // CHECKOUT HANDLER
  const handleCheckout = () => {
    if (isCheckingOut) return; // Prevent double click
    setIsCheckingOut(true);

    trackEvent.beginCheckout(selectedItems, finalTotalPrice);

    const query = new URLSearchParams()
    // Pass selected IDs to checkout
    query.set("items", selectedIds.join(','))
    
    // Pass coupon code if applied (Logic is correct here)
    if (appliedCoupon && appliedCoupon.code) {
      query.set("coupon", appliedCoupon.code)
    }
    
    router.push(`/checkout?${query.toString()}`)
  }

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

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 bg-muted/5 min-h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold mb-8">Keranjang Belanja</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        
        {/* Left: Cart Items List */}
        <div className="space-y-6">
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
                <span>Rp {subTotalPrice.toLocaleString("id-ID")}</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-green-600 font-medium animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center gap-1">
                    <TicketPercent className="h-4 w-4" />
                    <span>Diskon ({appliedCoupon.code})</span>
                  </div>
                  <span>-Rp {discountAmount.toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <label className="text-xs font-semibold text-muted-foreground mb-1.5 block">Makin hemat pakai kupon</label>
              <div className="flex gap-2">
                 <div className="relative flex-1">
                   <Input 
                     placeholder="Kode Kupon" 
                     value={couponCode}
                     onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                     disabled={!!appliedCoupon || isCheckingCoupon}
                     className="bg-background uppercase font-mono placeholder:normal-case placeholder:font-sans"
                   />
                   {appliedCoupon && (
                     <div className="absolute right-2 top-1/2 -translate-y-1/2">
                       <Badge variant="secondary" className="h-6 px-2 text-[10px] gap-1 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                         {appliedCoupon.discount_percent}%
                       </Badge>
                     </div>
                   )}
                 </div>
                 
                 {appliedCoupon ? (
                    <Button variant="outline" size="icon" onClick={handleRemoveCoupon} className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200">
                      <X className="h-4 w-4" />
                    </Button>
                 ) : (
                    <Button 
                      variant="secondary" 
                      onClick={handleApplyCoupon} 
                      disabled={!couponCode || isCheckingCoupon || selectedIds.length === 0}
                      className="shrink-0"
                    >
                      {isCheckingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gunakan"}
                    </Button>
                 )}
              </div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between items-end">
              <span className="font-bold text-base">Total Tagihan</span>
              <span className="font-bold text-2xl text-primary">
                Rp {finalTotalPrice.toLocaleString("id-ID")}
              </span>
            </div>

            <Button 
              className="w-full text-base py-6 font-bold shadow-lg shadow-primary/20" 
              size="lg" 
              disabled={selectedIds.length === 0 || isCheckingOut}
              onClick={handleCheckout}
            >
              {isCheckingOut ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                </>
              ) : (
                <>
                  Checkout <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
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