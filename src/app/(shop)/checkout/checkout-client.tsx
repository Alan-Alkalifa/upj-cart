"use client"

import { useState, useEffect } from "react"
import Script from "next/script"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2, Truck, MapPin, ShieldCheck, Ticket, Plus } from "lucide-react"

// Actions & Utils
import { calculateShippingAction, processCheckout, getLocationData, addUserAddressAction } from "@/app/(shop)/checkout/actions"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

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
  
  // State: Add Address Dialog
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false)
  const [isSavingAddress, setIsSavingAddress] = useState(false)
  const [newAddress, setNewAddress] = useState({
    label: "",
    recipient_name: "",
    phone: "",
    street_address: "",
    province_id: "",
    city_id: "",
    district_id: "",
    postal_code: ""
  })
  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])

  // State: Shipping Selection
  const [shippingState, setShippingState] = useState<ShippingState>({})
  const [shippingOptions, setShippingOptions] = useState<Record<string, any[]>>({})
  const [loadingShipping, setLoadingShipping] = useState<Record<string, boolean>>({})

  // Fetch Provinces when Dialog opens
  useEffect(() => {
    if (isAddAddressOpen && provinces.length === 0) {
      getLocationData('province').then(setProvinces)
    }
  }, [isAddAddressOpen, provinces.length])

  // Handle Location Change
  const handleProvinceChange = async (val: string) => {
    setNewAddress(prev => ({ ...prev, province_id: val, city_id: "", district_id: "" }))
    setCities([])
    setDistricts([])
    const data = await getLocationData('city', val)
    setCities(data)
  }

  const handleCityChange = async (val: string) => {
    setNewAddress(prev => ({ ...prev, city_id: val, district_id: "" }))
    setDistricts([])
    const data = await getLocationData('subdistrict', val)
    setDistricts(data)
  }

  // Save Address
  const handleSaveAddress = async () => {
    if (!newAddress.label || !newAddress.recipient_name || !newAddress.phone || !newAddress.street_address || !newAddress.district_id) {
      toast.error("Mohon lengkapi semua field alamat")
      return
    }

    setIsSavingAddress(true)
    try {
      const selectedProvince = provinces.find(p => p.province_id === newAddress.province_id)
      const selectedCity = cities.find(c => c.city_id === newAddress.city_id)
      const selectedDistrict = districts.find(d => d.subdistrict_id === newAddress.district_id)

      const res = await addUserAddressAction({
        ...newAddress,
        province_name: selectedProvince?.province || "",
        city_name: `${selectedCity?.type} ${selectedCity?.city_name}` || "",
        district_name: selectedDistrict?.subdistrict_name || "",
      })

      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success("Alamat berhasil ditambahkan")
        setIsAddAddressOpen(false)
        router.refresh() // Refresh to fetch new address
        // Reset form
        setNewAddress({ label: "", recipient_name: "", phone: "", street_address: "", province_id: "", city_id: "", district_id: "", postal_code: "" })
      }
    } catch (error) {
      toast.error("Gagal menyimpan alamat")
    } finally {
      setIsSavingAddress(false)
    }
  }

  // GROUP ITEMS BY MERCHANT
  const groupedItems: Record<string, any> = {}
  cartItems.forEach((item) => {
    const variant = item.product_variants
    const product = variant.products
    const org = product.organizations
    
    if (!groupedItems[org.id]) {
      groupedItems[org.id] = { org, items: [], totalWeight: 0, subtotal: 0 }
    }
    
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
      // Reset selection
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
          courier: prev[orgId]?.courier || 'jne',
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
      discountAmount = productTotal * (coupon.discount_percent / 100)
    }
  }

  const grandTotal = productTotal + shippingTotal - discountAmount

  // HANDLER: Payment
  const handlePay = async () => {
    if (!selectedAddressId) return toast.error("Pilih alamat pengiriman")
    
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
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" />
                            <h3 className="font-semibold text-lg">Alamat Pengiriman</h3>
                        </div>
                        
                        {/* ADD ADDRESS DIALOG */}
                        <Dialog open={isAddAddressOpen} onOpenChange={setIsAddAddressOpen}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Plus className="h-4 w-4 mr-2" /> Tambah Alamat
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Tambah Alamat Baru</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label>Label Alamat (contoh: Rumah, Kantor)</Label>
                                        <Input 
                                          value={newAddress.label} 
                                          onChange={e => setNewAddress({...newAddress, label: e.target.value})}
                                          placeholder="Rumah"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Nama Penerima</Label>
                                        <Input 
                                          value={newAddress.recipient_name} 
                                          onChange={e => setNewAddress({...newAddress, recipient_name: e.target.value})}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>No. Telepon</Label>
                                        <Input 
                                          value={newAddress.phone} 
                                          onChange={e => setNewAddress({...newAddress, phone: e.target.value})}
                                          type="tel"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Provinsi</Label>
                                        <Select onValueChange={handleProvinceChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Provinsi" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {provinces.map((p: any) => (
                                                    <SelectItem key={p.province_id} value={p.province_id}>{p.province}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Kota/Kabupaten</Label>
                                        <Select onValueChange={handleCityChange} disabled={!newAddress.province_id}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Kota" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {cities.map((c: any) => (
                                                    <SelectItem key={c.city_id} value={c.city_id}>{c.type} {c.city_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Kecamatan</Label>
                                        <Select 
                                            onValueChange={(val) => setNewAddress(prev => ({ ...prev, district_id: val }))}
                                            disabled={!newAddress.city_id}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih Kecamatan" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {districts.map((d: any) => (
                                                    <SelectItem key={d.subdistrict_id} value={d.subdistrict_id}>{d.subdistrict_name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Kode Pos</Label>
                                        <Input 
                                          value={newAddress.postal_code} 
                                          onChange={e => setNewAddress({...newAddress, postal_code: e.target.value})}
                                          type="number"
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Alamat Lengkap (Jalan, No. Rumah, RT/RW)</Label>
                                        <Input 
                                          value={newAddress.street_address} 
                                          onChange={e => setNewAddress({...newAddress, street_address: e.target.value})}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleSaveAddress} disabled={isSavingAddress}>
                                        {isSavingAddress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Simpan Alamat
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                    
                    {addresses.length === 0 ? (
                        <div className="text-center py-6 bg-muted/30 rounded-lg">
                            <p className="text-muted-foreground mb-3">Belum ada alamat tersimpan</p>
                            <Button variant="link" onClick={() => setIsAddAddressOpen(true)}>
                                Tambah Alamat Sekarang
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
                                           <p className="text-sm text-muted-foreground mt-1">{addr.street_address}</p>
                                           <p className="text-sm text-muted-foreground">{addr.district_name}, {addr.city_name}, {addr.province_name} {addr.postal_code}</p>
                                           <p className="text-sm text-muted-foreground">{addr.phone}</p>
                                       </div>
                                       {selectedAddressId === addr.id && <Badge>Dipilih</Badge>}
                                   </div>
                               </div>
                           ))}
                        </div>
                    )}
                </Card>
                
                {/* 2. Items & Shipping Section (Sama seperti sebelumnya) */}
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