"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2,
  Truck,
  MapPin,
  ShieldCheck,
  Ticket,
  Plus,
} from "lucide-react";

// Actions & Utils
import {
  calculateShippingAction,
  processCheckout,
  getLocationData,
  addUserAddressAction,
} from "@/app/(shop)/checkout/actions";

// UI Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

// --- TYPES ---
interface CheckoutClientProps {
  cartItems: any[];
  addresses: any[];
  coupon: any | null;
}

interface ShippingState {
  [orgId: string]: {
    courier: string;
    service: string;
    cost: number;
    etd: string;
  };
}

// FIX: Removed the conflicting 'declare global' block because 'snap'
// is already defined in the project's global type definitions.

export function CheckoutClient({
  cartItems,
  addresses,
  coupon,
}: CheckoutClientProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  // State: Address
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    addresses.length > 0 ? addresses[0].id : ""
  );

  // State: Add Address Dialog
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // FORM STATE
  const [newAddress, setNewAddress] = useState({
    label: "",
    recipient_name: "",
    phone: "",
    street_address: "",
    province_id: "",
    city_id: "",
    district_id: "",
    subdistrict_id: "",
    postal_code: "",
  });

  // LOCATION DATA STATE
  const [provinces, setProvinces] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [districts, setDistricts] = useState<any[]>([]);
  const [subdistricts, setSubdistricts] = useState<any[]>([]);

  // State: Shipping Selection
  const [shippingState, setShippingState] = useState<ShippingState>({});
  const [shippingOptions, setShippingOptions] = useState<Record<string, any[]>>(
    {}
  );
  const [loadingShipping, setLoadingShipping] = useState<
    Record<string, boolean>
  >({});

  // 1. Fetch Provinces saat Dialog dibuka
  useEffect(() => {
    if (isAddAddressOpen && provinces.length === 0) {
      getLocationData("province").then(setProvinces);
    }
  }, [isAddAddressOpen, provinces.length]);

  // 2. Handle Perubahan Lokasi (Cascading)
  const handleProvinceChange = async (val: string) => {
    setNewAddress((prev) => ({
      ...prev,
      province_id: val,
      city_id: "",
      district_id: "",
      subdistrict_id: "",
    }));
    setCities([]);
    setDistricts([]);
    setSubdistricts([]);

    const data = await getLocationData("city", val);
    setCities(data || []);
  };

  const handleCityChange = async (val: string) => {
    setNewAddress((prev) => ({
      ...prev,
      city_id: val,
      district_id: "",
      subdistrict_id: "",
    }));
    setDistricts([]);
    setSubdistricts([]);

    const data = await getLocationData("district", val);
    setDistricts(data || []);
  };

  const handleDistrictChange = async (val: string) => {
    setNewAddress((prev) => ({
      ...prev,
      district_id: val,
      subdistrict_id: "",
    }));
    setSubdistricts([]);

    const data = await getLocationData("subdistrict", val);
    setSubdistricts(data || []);
  };

  // Save Address
  const handleSaveAddress = async () => {
    if (
      !newAddress.label ||
      !newAddress.recipient_name ||
      !newAddress.phone ||
      !newAddress.street_address ||
      !newAddress.district_id
    ) {
      toast.error("Mohon lengkapi data alamat");
      return;
    }

    setIsSavingAddress(true);
    try {
      const selectedProvince = provinces.find(
        (p) => p.id === parseInt(newAddress.province_id)
      );
      const selectedCity = cities.find(
        (c) => c.id === parseInt(newAddress.city_id)
      );
      const selectedDistrict = districts.find(
        (d) => d.id === parseInt(newAddress.district_id)
      );
      const selectedSubdistrict = subdistricts.find(
        (d) => d.id === parseInt(newAddress.subdistrict_id)
      );

      const res = await addUserAddressAction({
        ...newAddress,
        province_name: selectedProvince?.name || "",
        city_name: selectedCity?.name || "",
        district_name: selectedDistrict?.name || "",
        subdistrict_name: selectedSubdistrict?.name || "",
        city: selectedCity?.name || "",
      });

      if (res.error) {
        toast.error(res.error);
      } else {
        toast.success("Alamat berhasil ditambahkan");
        setIsAddAddressOpen(false);
        router.refresh();
        setNewAddress({
          label: "",
          recipient_name: "",
          phone: "",
          street_address: "",
          province_id: "",
          city_id: "",
          district_id: "",
          subdistrict_id: "",
          postal_code: "",
        });
      }
    } catch (error) {
      console.error(error);
      toast.error("Gagal menyimpan alamat");
    } finally {
      setIsSavingAddress(false);
    }
  };

  // GROUP ITEMS BY MERCHANT
  const groupedItems: Record<string, any> = {};
  cartItems.forEach((item) => {
    const variant = item.product_variants;
    const product = variant.products;
    const org = product.organizations;

    if (!groupedItems[org.id]) {
      groupedItems[org.id] = { org, items: [], totalWeight: 0, subtotal: 0 };
    }

    // This creates a NEW object, which breaks reference equality checks later
    const weight = (product.weight_grams || 1000) * item.quantity;
    const price = variant.price_override || product.base_price;

    groupedItems[org.id].items.push({ ...item, weight, price });
    groupedItems[org.id].totalWeight += weight;
    groupedItems[org.id].subtotal += price * item.quantity;
  });

  // HELPER: Load Shipping Costs
  const handleCheckOngkir = async (orgId: string, courier: string) => {
    const address = addresses.find((a) => a.id === selectedAddressId);
    const destinationId = address?.subdistrict_id || address?.district_id;

    if (!destinationId) {
      toast.error("Alamat tidak lengkap (ID Kecamatan/Kelurahan hilang)");
      return;
    }

    const group = groupedItems[orgId];
    if (!group.org.origin_district_id) {
      toast.error("Toko ini belum mengatur lokasi pengiriman");
      return;
    }

    setLoadingShipping((prev) => ({ ...prev, [orgId]: true }));

    const res = await calculateShippingAction(
      group.org.origin_district_id.toString(),
      destinationId.toString(),
      group.totalWeight,
      courier
    );

    setLoadingShipping((prev) => ({ ...prev, [orgId]: false }));

    if (res.results) {
      setShippingOptions((prev) => ({ ...prev, [orgId]: res.results }));
      setShippingState((prev) => {
        const newState = { ...prev };
        delete newState[orgId];
        return newState;
      });
    } else {
      toast.error("Gagal cek ongkir", { description: res.error });
    }
  };

  // HELPER: Select Service
  const handleSelectService = (orgId: string, serviceName: string) => {
    const options = shippingOptions[orgId] || [];
    const selected = options.find((o: any) => o.service === serviceName);

    if (selected) {
      setShippingState((prev) => ({
        ...prev,
        [orgId]: {
          courier: prev[orgId]?.courier || "jne",
          service: selected.service,
          cost: selected.cost[0].value,
          etd: selected.cost[0].etd,
        },
      }));
    }
  };

  // --- CALCULATION LOGIC ---
  const productTotal = Object.values(groupedItems).reduce(
    (acc: number, group: any) => acc + group.subtotal,
    0
  );
  const shippingTotal = Object.values(shippingState).reduce(
    (acc, curr) => acc + curr.cost,
    0
  );
  const totalQty = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  let discountAmount = 0;
  if (coupon) {
    if (coupon.org_id) {
      const targetGroup = groupedItems[coupon.org_id];
      if (targetGroup)
        discountAmount = targetGroup.subtotal * (coupon.discount_percent / 100);
    } else {
      discountAmount = productTotal * (coupon.discount_percent / 100);
    }
  }
  const grandTotal = productTotal + shippingTotal - discountAmount;

  // --- HANDLE PAY WITH SNAP ---
  const handlePay = async () => {
    if (!selectedAddressId) return toast.error("Pilih alamat pengiriman");
    const unselectedStores = Object.keys(groupedItems).filter(
      (orgId) => !shippingState[orgId]
    );
    if (unselectedStores.length > 0)
      return toast.error("Pilih pengiriman untuk semua toko");

    setIsProcessing(true);
    const address = addresses.find((a) => a.id === selectedAddressId);

    // Construct Payload
    const itemsPayload = cartItems.map((item) => {
      // FIX: Don't use .includes() or .find() on groupedItems values because
      // groupedItems contains COPIES of the items. Use the ID directly.
      const orgId = item.product_variants.products.organizations.id;
      const group = groupedItems[orgId];

      // Safe check to ensure group exists (it should)
      if (!group) {
        console.error("Group not found for item:", item);
        throw new Error("Data error: Organization group missing");
      }

      return {
        cart_id: item.id,
        variant_id: item.product_variants.id,
        quantity: item.quantity,
        price:
          item.product_variants.price_override ||
          item.product_variants.products.base_price,
        weight: item.product_variants.products.weight_grams || 1000,
        product_name: item.product_variants.products.name,
        org_id: group.org.id,
        org_origin_id: group.org.origin_district_id,
      };
    });

    try {
      // 1. Create Order in DB & Get Snap Token from Server
      const res = await processCheckout(
        itemsPayload,
        selectedAddressId,
        shippingState,
        address.district_id
      );

      if (res.error) {
        toast.error(res.error);
        setIsProcessing(false);
        return;
      }

      // 2. Trigger Snap Popup
      if (res.snapToken && window.snap) {
        window.snap.pay(res.snapToken, {
          onSuccess: (result: any) => {
            console.log("Payment Success", result);
            router.push(`/orders/success?order_id=${result.order_id}`);
          },
          onPending: (result: any) => {
            console.log("Payment Pending", result);
            toast.info("Pesanan dibuat. Silakan selesaikan pembayaran.");
            router.push("/orders");
          },
          onError: (result: any) => {
            console.error("Payment Error", result);
            toast.error("Pembayaran gagal atau ditolak.");
            setIsProcessing(false);
          },
          onClose: () => {
            console.log(
              "Customer closed the popup without finishing the payment"
            );
            toast.warning("Pembayaran belum diselesaikan.");
            const targetUrl =
              process.env.NEXT_PUBLIC_AFTER_PAYMENT_URL || "/orders";
            router.push(targetUrl);
          },
        });
      } else {
        toast.error("Gagal memuat sistem pembayaran. Coba refresh halaman.");
        setIsProcessing(false);
      }
    } catch (err) {
      console.error(err);
      toast.error("Terjadi kesalahan sistem");
      setIsProcessing(false);
    }
  };

  // Determine Snap URL based on environment
  const snapScriptUrl =
    process.env.NEXT_PUBLIC_MIDTRANS_IS_PRODUCTION === "true"
      ? process.env.NEXT_PUBLIC_MIDTRANS_URL
      : "https://app.sandbox.midtrans.com/snap/snap.js";

  return (
    <>
      {/* Midtrans Snap Script */}
      <Script
        src={snapScriptUrl}
        data-client-key={process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY}
        strategy="lazyOnload"
      />

      <div className="container mx-auto px-4 py-8 lg:py-12 bg-muted/5 min-h-screen">
        <h1 className="text-2xl font-bold mb-6">Checkout Pengiriman</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <div className="space-y-6">
            {/* ADDRESS SECTION */}
            <Card className="p-6">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-lg">Alamat Pengiriman</h3>
                </div>
                <Dialog
                  open={isAddAddressOpen}
                  onOpenChange={setIsAddAddressOpen}
                >
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
                      {/* Form inputs omitted for brevity - no changes here */}
                      <div className="grid gap-2">
                        <Label>Label Alamat</Label>
                        <Input
                          value={newAddress.label}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              label: e.target.value,
                            })
                          }
                          placeholder="Rumah"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Nama Penerima</Label>
                        <Input
                          value={newAddress.recipient_name}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              recipient_name: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>No. Telepon</Label>
                        <Input
                          value={newAddress.phone}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              phone: e.target.value,
                            })
                          }
                          type="tel"
                        />
                      </div>

                      {/* Cascading Location Selects */}
                      <div className="grid gap-2">
                        <Label>Provinsi</Label>
                        <Select onValueChange={handleProvinceChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Provinsi" />
                          </SelectTrigger>
                          <SelectContent>
                            {provinces.map((p: any) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Kota/Kabupaten</Label>
                        <Select
                          onValueChange={handleCityChange}
                          disabled={!newAddress.province_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Kota" />
                          </SelectTrigger>
                          <SelectContent>
                            {cities.map((c: any) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Kecamatan</Label>
                        <Select
                          onValueChange={handleDistrictChange}
                          disabled={!newAddress.city_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Kecamatan" />
                          </SelectTrigger>
                          <SelectContent>
                            {districts.map((d: any) => (
                              <SelectItem key={d.id} value={d.id.toString()}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Kelurahan</Label>
                        <Select
                          onValueChange={(val) =>
                            setNewAddress((prev) => ({
                              ...prev,
                              subdistrict_id: val,
                            }))
                          }
                          disabled={!newAddress.district_id}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih Kelurahan" />
                          </SelectTrigger>
                          <SelectContent>
                            {subdistricts.map((d: any) => (
                              <SelectItem key={d.id} value={d.id.toString()}>
                                {d.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Kode Pos</Label>
                        <Input
                          value={newAddress.postal_code}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              postal_code: e.target.value,
                            })
                          }
                          type="number"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Detail Jalan</Label>
                        <Input
                          value={newAddress.street_address}
                          onChange={(e) =>
                            setNewAddress({
                              ...newAddress,
                              street_address: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        onClick={handleSaveAddress}
                        disabled={isSavingAddress}
                      >
                        {isSavingAddress && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}{" "}
                        Simpan
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid gap-3">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-4 rounded-lg border cursor-pointer ${
                      selectedAddressId === addr.id
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <p className="font-medium">
                      {addr.label} ({addr.recipient_name})
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {addr.street_address}, {addr.district_name},{" "}
                      {addr.city_name}
                    </p>
                  </div>
                ))}
                {addresses.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Belum ada alamat tersimpan.
                  </p>
                )}
              </div>
            </Card>

            {/* ITEMS & SHIPPING */}
            {Object.values(groupedItems).map((group: any) => (
              <Card key={group.org.id} className="p-6">
                <div className="flex items-center gap-2 mb-4 border-b pb-4">
                  <Truck className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold">{group.org.name}</h3>
                </div>

                <div className="mb-6 space-y-4">
                  {group.items.map((item: any) => (
                    <div
                      key={item.id}
                      className="flex gap-4 bg-background p-3 rounded-lg border"
                    >
                      <div className="h-16 w-16 bg-muted rounded-md overflow-hidden shrink-0 relative border">
                        {item.product_variants.products.image_url ? (
                          <Image
                            src={item.product_variants.products.image_url}
                            alt={item.product_variants.products.name}
                            fill
                            sizes="64px" // FIX: Added sizes prop to fix the warning
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            No Img
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-sm line-clamp-2">
                          {item.product_variants.products.name}
                        </h4>
                        <p className="text-xs text-muted-foreground mb-1">
                          Varian: {item.product_variants.name}
                        </p>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">
                            {item.quantity} x Rp{" "}
                            {item.price.toLocaleString("id-ID")}
                          </span>
                          <span className="font-semibold">
                            Rp{" "}
                            {(item.quantity * item.price).toLocaleString(
                              "id-ID"
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-muted/30 p-4 rounded-lg space-y-3">
                  <label className="text-sm font-medium">
                    Pilih Pengiriman
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Select
                      onValueChange={(val: any) => {
                        handleCheckOngkir(group.org.id, val);
                        setShippingState((prev) => ({
                          ...prev,
                          [group.org.id]: {
                            ...prev[group.org.id],
                            courier: val,
                            service: "",
                            cost: 0,
                            etd: "",
                          },
                        }));
                      }}
                    >
                      <SelectTrigger className="w-full sm:w-[140px] bg-background">
                        <SelectValue placeholder="Kurir" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="jne">JNE</SelectItem>
                        <SelectItem value="jnt">J&T</SelectItem>
                        <SelectItem value="sicepat">SiCepat</SelectItem>
                        <SelectItem value="idexpress">ID Express</SelectItem>
                        <SelectItem value="anteraja">AnterAja</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select
                      disabled={!shippingOptions[group.org.id]}
                      onValueChange={(val) =>
                        handleSelectService(group.org.id, val)
                      }
                    >
                      <SelectTrigger className="flex-1 bg-background">
                        <SelectValue
                          placeholder={
                            loadingShipping[group.org.id]
                              ? "Memuat..."
                              : "Pilih Layanan"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {(shippingOptions[group.org.id] || []).map(
                          (opt: any, idx: number) => (
                            <SelectItem key={idx} value={opt.service}>
                              <div className="flex justify-between w-full min-w-[200px] gap-4">
                                <span>
                                  {opt.service} ({opt.cost[0].etd} hari)
                                </span>
                                <span className="font-medium">
                                  Rp {opt.cost[0].value.toLocaleString("id-ID")}
                                </span>
                              </div>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* RIGHT COLUMN SUMMARY */}
          <div className="h-fit lg:sticky lg:top-24">
            <Card className="p-6 space-y-6 shadow-md border-primary/20">
              <h3 className="font-semibold text-lg">Ringkasan Pembayaran</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Harga ({totalQty} barang)</span>
                  <span>Rp {productTotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Total Ongkos Kirim</span>
                  <span>Rp {shippingTotal.toLocaleString("id-ID")}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-600 font-medium">
                    <div className="flex items-center gap-1">
                      <Ticket className="h-3 w-3" /> Diskon
                    </div>
                    <span>-Rp {discountAmount.toLocaleString("id-ID")}</span>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex justify-between font-bold text-xl text-primary">
                <span>Total Tagihan</span>
                <span>Rp {grandTotal.toLocaleString("id-ID")}</span>
              </div>

              <Button
                onClick={handlePay}
                className="w-full py-6 text-lg font-bold shadow-lg shadow-primary/20"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "Bayar Sekarang"
                )}
              </Button>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded-lg">
                <ShieldCheck className="h-4 w-4 text-green-600" />
                <span>Transaksi aman dengan Midtrans</span>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
