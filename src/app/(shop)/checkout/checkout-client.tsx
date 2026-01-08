"use client"

import { useState } from "react"
import Script from "next/script"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Truck, MapPin, ShieldCheck, Ticket } from "lucide-react"

// Actions & Utils
import { calculateShippingAction, processCheckout } from "@/app/(shop)/checkout/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

// --- TYPES ---
interface CheckoutClientProps {
  cartItems: any[]
  addresses: any[]
  coupon: any | null
}

interface ShippingState {
  [orgId: string]: {
    courier: 'jne' | 'pos' | 'tiki';
    service: string;
    cost: number;
    etd: string;
  }
}

export function CheckoutClient({ cartItems, addresses, coupon }: CheckoutClientProps) {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  
  // State: Address
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses.length > 0 ? addresses[0].id : ""
  )
  
  // State: Shipping Selection
  const [shippingState, setShippingState] = useState<ShippingState>({})
  
  // State: Shipping Options (Loaded from API)
  const [shippingOptions, setShippingOptions] = useState<Record<string, any[]>>({})
  const [loadingShipping, setLoadingShipping] = useState<Record<string, boolean>>({})

  // GROUP ITEMS BY MERCHANT
  const groupedItems: Record<string, any> = {}
  cartItems.forEach((item) => {
    const variant = item.product_variants
    const product = variant.products
    const org = product.organizations
    
    if (!groupedItems[org.id]) {
      groupedItems[org.id] = { org, items: [], totalWeight: 0, subtotal: 0 }
    }
    
    // Weight Calculation: Variant (if any, typically not in type) -> Product weight -> Default 1kg
    // FIXED: Removed variant.weight_grams as it does not exist in the Supabase types provided.
    const weight = (product.weight_grams || 1000) * item.quantity
    const price = variant.price_override || product.base_price
    
    groupedItems[org.id].items.push({ ...item, weight, price })
    groupedItems[org.id].totalWeight += weight
    groupedItems[org.id].subtotal += (price * item.quantity)
  })

  // HELPER: Load Shipping Costs
  const handleCheckOngkir = async (orgId: string, courier: 'jne' | 'pos' | 'tiki') => {
    const address = addresses.find(a => a.id === selectedAddressId)
    if (!address?.district_id) {
      toast.error("Alamat tidak valid (District ID hilang)")
      return
    }

    const group = groupedItems[orgId]
    if (!group.org.origin_district_id) {
      toast.error("Toko ini belum mengatur lokasi pengiriman")
      return
    }

    setLoadingShipping(prev => ({ ...prev, [orgId]: true }))
    
    const res = await calculateShippingAction(
      group.org.origin_district_id,
      address.district_id,
      group.totalWeight,
      courier
    )

    setLoadingShipping(prev => ({ ...prev, [orgId]: false }))

    if (res.results) {
      setShippingOptions(prev => ({ ...prev, [orgId]: res.results }))
      // Reset selection for this store
      setShippingState(prev => {
        const newState = { ...prev }
        delete newState[orgId]
        return newState
      })
    } else {
      toast.error("Gagal cek ongkir", { description: res.error })
    }
  }

  // HELPER: Select Service
  const handleSelectService = (orgId: string, serviceName: string) => {
    const options = shippingOptions[orgId] || []
    const selected = options.find((o: any) => o.service === serviceName)
    
    if (selected) {
      setShippingState(prev => ({
        ...prev,
        [orgId]: {
          courier: prev[orgId]?.courier || 'jne', // Fallback preserve courier
          service: selected.service,
          cost: selected.cost[0].value,
          etd: selected.cost[0].etd
        }
      }))
    }
  }

  // CALCULATION: Totals
  const productTotal = Object.values(groupedItems).reduce((acc: number, group: any) => acc + group.subtotal, 0)
  const shippingTotal = Object.values(shippingState).reduce((acc, curr) => acc + curr.cost, 0)
  
  // Coupon Calculation
  let discountAmount = 0
  if (coupon) {
    if (coupon.org_id) {
      const targetGroup = groupedItems[coupon.org_id]
      if (targetGroup) {
        discountAmount = targetGroup.subtotal * (coupon.discount_percent / 100)
      }
    } else {
      // Global coupon
      discountAmount = productTotal * (coupon.discount_percent / 100)
    }
  }

  const grandTotal = productTotal + shippingTotal - discountAmount

  // HANDLER: Payment
  const handlePay = async () => {
    if (!selectedAddressId) return toast.error("Pilih alamat pengiriman")
    
    // Validate: All stores must have shipping selected
    const unselectedStores = Object.keys(groupedItems).filter(orgId => !shippingState[orgId])
    if (unselectedStores.length > 0) {
      return toast.error("Mohon pilih pengiriman untuk semua toko")
    }

    setIsProcessing(true)

    const address = addresses.find(a => a.id === selectedAddressId)
    const itemsPayload = cartItems.map(item => {
        const group = Object.values(groupedItems).find((g: any) => g.items.includes(item)) as any
        return {
            cart_id: item.id,
            variant_id: item.product_variants.id,
            quantity: item.quantity,
            price: item.product_variants.price_override || item.product_variants.products.base_price,
            // FIXED: Use product weight.
            weight: (item.product_variants.products.weight_grams || 1000),
            product_name: item.product_variants.products.name,
            org_id: group.org.id,
            org_origin_id: group.org.origin_district_id
        }
    })

    try {
        const res = await processCheckout(
            itemsPayload, 
            selectedAddressId, 
            shippingState, 
            address.district_id
        )

        if (res.error) {
            toast.error(res.error)
        } else if (res.snapToken) {
            // @ts-ignore
            window.snap.pay(res.snapToken, {
                onSuccess: (result: any) => {
                   router.push(`/orders/success?order_id=${result.order_id}`)
                },
                onPending: (result: any) => {
                   toast.info("Menunggu pembayaran...")
                   router.push("/orders/history")
                },
                onError: (result: any) => {
                   toast.error("Pembayaran gagal")
                },
                onClose: () => {
                   toast.warning("Pop-up pembayaran ditutup")
                }
            })
        }
    } catch (err) {
        toast.error("Terjadi kesalahan sistem")
    } finally {
        setIsProcessing(false)
    }
  }

  return (
    <>
      <Script 
        src="https://app.sandbox.midtrans.com/snap/snap.js" 
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY} 
        strategy="lazyOnload"
      />

      <div className="container mx-auto px-4 py-8 lg:py-12 bg-muted/5 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Checkout Pengiriman</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6">
                
                {/* 1. Address Section */}
                <Card className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MapPin className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg">Alamat Pengiriman</h3>
                    </div>
                    
                    {addresses.length === 0 ? (
                        <div className="text-center py-6 bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground mb-3">Belum ada alamat tersimpan</p>
                            <Button variant="outline" onClick={() => router.push('/settings/address')}>
                                Tambah Alamat Baru
                            </Button>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                           {addresses.map((addr) => (
                               <div 
                                 key={addr.id}
                                 onClick={() => setSelectedAddressId(addr.id)}
                                 className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                     selectedAddressId === addr.id 
                                     ? "border-primary bg-primary/5 ring-1 ring-primary" 
                                     : "hover:border-primary/50"
                                 }`}
                               >
                                   <div className="flex justify-between items-start">
                                       <div>
                                           <p className="font-medium">{addr.label} <span className="text-muted-foreground font-normal">({addr.recipient_name})</span></p>
                                           <p className="text-sm text-muted-foreground mt-1">{addr.street_address}, {addr.city_name}, {addr.province_name}</p>
                                           <p className="text-sm text-muted-foreground">{addr.phone}</p>
                                       </div>
                                       {selectedAddressId === addr.id && <Badge>Dipilih</Badge>}
                                   </div>
                               </div>
                           ))}
                        </div>
                    )}
                </Card>

                {/* 2. Items & Shipping Section */}
                {Object.values(groupedItems).map((group: any) => (
                    <Card key={group.org.id} className="p-6">
                        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                            <Truck className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold">{group.org.name}</h3>
                        </div>

                        {/* Product List */}
                        <div className="space-y-4 mb-6">
                            {group.items.map((item: any) => (
                                <div key={item.id} className="flex gap-4">
                                    <div className="h-16 w-16 bg-muted rounded-md overflow-hidden relative border">
                                        {item.product_variants.products.image_url && (
                                            <Image 
                                              src={item.product_variants.products.image_url} 
                                              alt={item.product_variants.name}
                                              fill
                                              className="object-cover"
                                            />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-medium text-sm line-clamp-1">{item.product_variants.products.name}</h4>
                                        <p className="text-xs text-muted-foreground mt-1">Varian: {item.product_variants.name}</p>
                                        <div className="flex justify-between mt-2">
                                            <span className="text-xs text-muted-foreground">{item.quantity} x Rp {item.price.toLocaleString("id-ID")}</span>
                                            <span className="font-medium text-sm">Rp {(item.quantity * item.price).toLocaleString("id-ID")}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Courier Selection */}
                        <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                            <label className="text-sm font-medium">Pilih Pengiriman</label>
                            <div className="flex gap-3">
                                <Select onValueChange={(val: any) => {
                                    handleCheckOngkir(group.org.id, val)
                                    setShippingState(prev => ({ 
                                        ...prev, 
                                        [group.org.id]: { ...prev[group.org.id], courier: val, service: "", cost: 0, etd: "" } 
                                    }))
                                }}>
                                    <SelectTrigger className="w-[140px] bg-background">
                                        <SelectValue placeholder="Kurir" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="jne">JNE</SelectItem>
                                        <SelectItem value="pos">POS Indonesia</SelectItem>
                                        <SelectItem value="tiki">TIKI</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select 
                                    disabled={!shippingOptions[group.org.id] || loadingShipping[group.org.id]}
                                    onValueChange={(val) => handleSelectService(group.org.id, val)}
                                >
                                    <SelectTrigger className="flex-1 bg-background">
                                        <SelectValue placeholder={loadingShipping[group.org.id] ? "Memuat..." : "Pilih Layanan"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {(shippingOptions[group.org.id] || []).map((opt: any, idx: number) => (
                                            <SelectItem key={idx} value={opt.service}>
                                                <div className="flex justify-between w-full min-w-[200px] gap-4">
                                                    <span>{opt.service} ({opt.description})</span>
                                                    <span className="font-medium">Rp {opt.cost[0].value.toLocaleString("id-ID")}</span>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            {shippingState[group.org.id]?.etd && (
                                <p className="text-xs text-muted-foreground text-right">
                                    Estimasi tiba: {shippingState[group.org.id].etd} hari
                                </p>
                            )}
                        </div>
                    </Card>
                ))}
            </div>

            {/* RIGHT COLUMN: Summary */}
            <div className="h-fit lg:sticky lg:top-24">
                <Card className="p-6 space-y-6">
                    <h3 className="font-semibold text-lg">Ringkasan Pembayaran</h3>
                    
                    <div className="space-y-3 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                            <span>Total Harga ({cartItems.length} barang)</span>
                            <span>Rp {productTotal.toLocaleString("id-ID")}</span>
                        </div>
                        <div className="flex justify-between text-muted-foreground">
                            <span>Total Ongkos Kirim</span>
                            <span>Rp {shippingTotal.toLocaleString("id-ID")}</span>
                        </div>
                        {discountAmount > 0 && (
                             <div className="flex justify-between text-green-600 font-medium">
                                <div className="flex items-center gap-1">
                                    <Ticket className="h-4 w-4" />
                                    <span>Diskon ({coupon?.code})</span>
                                </div>
                                <span>-Rp {discountAmount.toLocaleString("id-ID")}</span>
                             </div>
                        )}
                        <Separator />
                        <div className="flex justify-between items-end">
                            <span className="font-bold text-base">Total Tagihan</span>
                            <span className="font-bold text-2xl text-primary">Rp {grandTotal.toLocaleString("id-ID")}</span>
                        </div>
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full font-bold shadow-lg shadow-primary/20"
                        onClick={handlePay}
                        disabled={isProcessing || !selectedAddressId}
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...
                            </>
                        ) : (
                            <>Bayar Sekarang <ShieldCheck className="ml-2 h-4 w-4" /></>
                        )}
                    </Button>
                </Card>
            </div>
        </div>
      </div>
    </>
  )
}