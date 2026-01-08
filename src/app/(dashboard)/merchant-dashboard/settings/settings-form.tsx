"use client"

import { useState, useTransition, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { organizationSchema } from "@/lib/dashboard-schemas"
import { updateOrganization, getLocationData } from "./actions"
import { createClient } from "@/utils/supabase/client"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, ImageIcon, MapPin, Globe, CreditCard, Pencil, Save, X } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"

export function SettingsForm({ initialData, orgId }: { initialData: any, orgId: string }) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  // Location State (Consistent with Checkout)
  const [changeLocation, setChangeLocation] = useState(false)
  const [provinces, setProvinces] = useState<any[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [districts, setDistricts] = useState<any[]>([])
  const [subdistricts, setSubdistricts] = useState<any[]>([])
  
  const [selectedProv, setSelectedProv] = useState("")
  const [selectedCity, setSelectedCity] = useState("")
  const [selectedDistrict, setSelectedDistrict] = useState("")
  const [loadingLoc, setLoadingLoc] = useState(false)

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: initialData.name || "",
      slug: initialData.slug || "",
      description: initialData.description || "",
      logo_url: initialData.logo_url || "",
      banner_url: initialData.banner_url || "",
      
      website_url: initialData.website_url || "",
      instagram_url: initialData.instagram_url || "",
      tiktok_url: initialData.tiktok_url || "",

      address_street: initialData.address_street || "",
      address_district: initialData.address_district || "",
      address_city: initialData.address_city || "",
      address_postal_code: initialData.address_postal_code || "",
      
      origin_district_id: initialData.origin_district_id || "",
      origin_district_name: initialData.origin_district_name || "",

      bank_name: initialData.bank_name || "",
      bank_account_number: initialData.bank_account_number || "",
      bank_account_holder: initialData.bank_account_holder || "",
    }
  })

  // Load Provinces when user activates location editing
  useEffect(() => {
    if (changeLocation && provinces.length === 0) {
      setLoadingLoc(true)
      getLocationData('province').then(res => {
        setProvinces(res || [])
        setLoadingLoc(false)
      })
    }
  }, [changeLocation, provinces.length])

  // 1. Handle Province Change
  const handleProvinceChange = async (provId: string) => {
    setSelectedProv(provId)
    setSelectedCity("")
    setSelectedDistrict("")
    
    setCities([])
    setDistricts([])
    setSubdistricts([])
    
    setLoadingLoc(true)
    const res = await getLocationData('city', provId)
    setCities(res || [])
    setLoadingLoc(false)
  }

  // 2. Handle City Change
  const handleCityChange = async (cityId: string) => {
    setSelectedCity(cityId)
    setSelectedDistrict("")
    
    setDistricts([])
    setSubdistricts([])

    // Update City Name in Form
    const cityObj = cities.find(c => String(c.city_id || c.id) === cityId)
    if (cityObj) {
      const type = cityObj.type === "Kota" ? "Kota" : "Kabupaten"
      const name = cityObj.city_name || cityObj.name
      form.setValue("address_city", `${type} ${name}`)
    }

    setLoadingLoc(true)
    const res = await getLocationData('district', cityId)
    setDistricts(res || [])
    setLoadingLoc(false)
  }

  // 3. Handle District (Kecamatan) Change
  const handleDistrictChange = async (districtId: string) => {
    setSelectedDistrict(districtId)
    setSubdistricts([])

    // Update District Name in Form
    const distObj = districts.find(d => String(d.district_id || d.id) === districtId)
    if (distObj) {
       const name = distObj.district_name || distObj.name
       form.setValue("address_district", name)
    }

    setLoadingLoc(true)
    const res = await getLocationData('subdistrict', districtId)
    setSubdistricts(res || [])
    setLoadingLoc(false)
  }

  // 4. Handle Subdistrict (Kelurahan) Change - Final Step
  const handleSubdistrictChange = (subdistrictId: string) => {
     const subObj = subdistricts.find(s => String(s.subdistrict_id || s.id) === subdistrictId)
     if (subObj) {
        // Save the ID to origin_district_id (DB field for shipping origin)
        // Note: Komerce prefers Subdistrict ID for higher accuracy
        form.setValue("origin_district_id", String(subObj.subdistrict_id || subObj.id))
        form.setValue("origin_district_name", subObj.subdistrict_name || subObj.name)
     }
  }

  // --- UPLOAD HANDLER ---
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, fieldName: "logo_url" | "banner_url") {
    const file = e.target.files?.[0]
    if (!file) return

    const isBanner = fieldName === "banner_url"
    if (isBanner) setUploadingBanner(true)
    else setUploadingLogo(true)

    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${orgId}/${fieldName}_${Date.now()}.${fileExt}`

    const { error } = await supabase.storage.from('organizations').upload(fileName, file)

    if (error) {
      toast.error("Upload gagal: " + error.message)
    } else {
      const { data } = supabase.storage.from('organizations').getPublicUrl(fileName)
      form.setValue(fieldName, data.publicUrl)
      toast.success(isBanner ? "Banner diupload" : "Logo diupload")
    }

    if (isBanner) setUploadingBanner(false)
    else setUploadingLogo(false)
  }

  function onSubmit(values: z.infer<typeof organizationSchema>) {
    startTransition(async () => {
      const res = await updateOrganization(orgId, values)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Pengaturan disimpan!")
        setIsEditing(false)
        setChangeLocation(false)
      }
    })
  }

  const cancelEdit = () => {
    form.reset()
    setIsEditing(false)
    setChangeLocation(false)
  }

  // --- RENDER HELPERS ---
  const RenderField = ({ field, placeholder, textarea = false }: { field: any, placeholder?: string, textarea?: boolean }) => {
    if (!isEditing) {
      return <div className="p-2 px-3 rounded-md border bg-muted/50 text-sm min-h-[40px] flex items-center">{field.value || "-"}</div>
    }
    return textarea ? (
      <Textarea placeholder={placeholder} {...field} />
    ) : (
      <Input placeholder={placeholder} {...field} />
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-10">
        
        {/* ACTION BAR */}
        <div className="flex justify-between items-center bg-background sticky top-0 z-10 py-4 border-b">
           <div>
              <h3 className="text-lg font-semibold">Profil & Pengaturan</h3>
              <p className="text-sm text-muted-foreground">{isEditing ? "Mode Edit: Silahkan sesuaikan data." : "Mode Lihat: Klik Edit untuk mengubah."}</p>
           </div>
           <div className="flex gap-2">
              {!isEditing ? (
                <Button type="button" onClick={() => setIsEditing(true)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit Profil
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={cancelEdit} disabled={isPending}>
                    <X className="w-4 h-4 mr-2" /> Batal
                  </Button>
                  <Button type="submit" disabled={isPending || uploadingLogo || uploadingBanner}>
                    {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Simpan
                  </Button>
                </>
              )}
           </div>
        </div>

        {/* 1. IDENTITY SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Identitas Toko</CardTitle>
            <CardDescription>Logo, banner, dan deskripsi profil toko Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            <div className="grid gap-6 md:grid-cols-2">
              {/* LOGO */}
              <div className="flex flex-col gap-3">
                <FormLabel>Logo Toko</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border">
                    <AvatarImage src={form.watch("logo_url")} className="object-cover" />
                    <AvatarFallback>LG</AvatarFallback>
                  </Avatar>
                  {isEditing && (
                    <div className="flex-1">
                      <Input 
                        type="file" 
                        accept="image/*" 
                        disabled={uploadingLogo} 
                        onChange={(e) => handleUpload(e, "logo_url")} 
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Format: JPG, PNG. Max 2MB.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* BANNER */}
              <div className="flex flex-col gap-3">
                <FormLabel>Banner Toko</FormLabel>
                <div className="space-y-2">
                   <div className="relative w-full aspect-[3/1] bg-muted rounded-md overflow-hidden border">
                      {form.watch("banner_url") ? (
                        <img src={form.watch("banner_url")} alt="Banner" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-muted-foreground text-xs">
                           No Banner
                        </div>
                      )}
                      {uploadingBanner && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
                           <Loader2 className="animate-spin" />
                        </div>
                      )}
                   </div>
                   {isEditing && (
                     <Input 
                        type="file" 
                        accept="image/*" 
                        disabled={uploadingBanner} 
                        onChange={(e) => handleUpload(e, "banner_url")} 
                      />
                   )}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Toko</FormLabel>
                  <FormControl>
                    <RenderField field={field} placeholder="Contoh: Toko Serba Ada" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (Link Toko)</FormLabel>
                  <FormControl>
                    <div className="p-2 px-3 rounded-md border bg-muted text-sm text-muted-foreground">{field.value}</div>
                  </FormControl>
                  <FormDescription>Slug tidak dapat diubah.</FormDescription>
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Deskripsi Singkat</FormLabel>
                <FormControl>
                   <RenderField field={field} placeholder="Ceritakan tentang toko Anda..." textarea />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </CardContent>
        </Card>

        {/* 2. ADDRESS SECTION */}
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Alamat Toko</CardTitle>
             <CardDescription>
                Digunakan untuk titik penjemputan kurir. 
                {form.watch("origin_district_name") ? (
                   <span className="ml-1 text-green-600 font-medium">
                      (Terverifikasi: {form.watch("origin_district_name")})
                   </span>
                ) : (
                   <span className="ml-1 text-yellow-600 font-medium">(Belum diatur untuk pengiriman)</span>
                )}
             </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             {/* Read Mode Display */}
             {!isEditing && (
                <div className="grid gap-4">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                         <FormLabel className="text-xs text-muted-foreground">Kota/Kabupaten</FormLabel>
                         <div className="font-medium">{form.watch("address_city") || "-"}</div>
                      </div>
                      <div>
                         <FormLabel className="text-xs text-muted-foreground">Kecamatan</FormLabel>
                         <div className="font-medium">{form.watch("address_district") || "-"}</div>
                      </div>
                      <div>
                         <FormLabel className="text-xs text-muted-foreground">Kelurahan (Origin)</FormLabel>
                         <div className="font-medium">{form.watch("origin_district_name") || "-"}</div>
                      </div>
                   </div>
                   <div>
                       <FormLabel className="text-xs text-muted-foreground">Jalan / Alamat Lengkap</FormLabel>
                       <div className="font-medium">{form.watch("address_street") || "-"}</div>
                   </div>
                   <div>
                       <FormLabel className="text-xs text-muted-foreground">Kode Pos</FormLabel>
                       <div className="font-medium">{form.watch("address_postal_code") || "-"}</div>
                   </div>
                </div>
             )}

             {/* Edit Mode */}
             {isEditing && (
               <>
                 <div className="flex items-center justify-between p-4 border rounded-lg bg-accent/20">
                    <div className="space-y-0.5">
                       <FormLabel>Ubah Lokasi?</FormLabel>
                       <FormDescription>Aktifkan untuk memilih ulang lokasi (Provinsi - Kota - Kecamatan - Kelurahan).</FormDescription>
                    </div>
                    <Switch checked={changeLocation} onCheckedChange={setChangeLocation} />
                 </div>

                 {changeLocation && (
                    <div className="grid gap-4 p-4 border rounded-lg animate-in fade-in slide-in-from-top-2">
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* 1. Provinsi */}
                          <div className="space-y-2">
                             <FormLabel>Provinsi</FormLabel>
                             <Select onValueChange={handleProvinceChange} disabled={loadingLoc}>
                                <SelectTrigger>
                                   <SelectValue placeholder="Pilih Provinsi" />
                                </SelectTrigger>
                                <SelectContent>
                                   {provinces.map((p) => (
                                      <SelectItem key={String(p.province_id || p.id)} value={String(p.province_id || p.id)}>
                                         {p.province || p.name}
                                      </SelectItem>
                                   ))}
                                </SelectContent>
                             </Select>
                          </div>

                          {/* 2. Kota */}
                          <div className="space-y-2">
                             <FormLabel>Kota/Kabupaten</FormLabel>
                             <Select onValueChange={handleCityChange} disabled={!selectedProv || loadingLoc} value={selectedCity}>
                                <SelectTrigger>
                                   <SelectValue placeholder="Pilih Kota" />
                                </SelectTrigger>
                                <SelectContent>
                                   {cities.map((c) => (
                                      <SelectItem key={String(c.city_id || c.id)} value={String(c.city_id || c.id)}>
                                         {c.type} {c.city_name || c.name}
                                      </SelectItem>
                                   ))}
                                </SelectContent>
                             </Select>
                          </div>

                          {/* 3. Kecamatan */}
                          <div className="space-y-2">
                             <FormLabel>Kecamatan</FormLabel>
                             <Select onValueChange={handleDistrictChange} disabled={!selectedCity || loadingLoc} value={selectedDistrict}>
                                <SelectTrigger>
                                   <SelectValue placeholder="Pilih Kecamatan" />
                                </SelectTrigger>
                                <SelectContent>
                                   {districts.map((d) => (
                                      <SelectItem key={String(d.district_id || d.id)} value={String(d.district_id || d.id)}>
                                         {d.district_name || d.name}
                                      </SelectItem>
                                   ))}
                                </SelectContent>
                             </Select>
                          </div>

                          {/* 4. Kelurahan (Subdistrict) */}
                          <div className="space-y-2">
                             <FormLabel>Kelurahan</FormLabel>
                             <Select onValueChange={handleSubdistrictChange} disabled={!selectedDistrict || loadingLoc}>
                                <SelectTrigger>
                                   <SelectValue placeholder="Pilih Kelurahan" />
                                </SelectTrigger>
                                <SelectContent>
                                   {subdistricts.map((s) => (
                                      <SelectItem key={String(s.subdistrict_id || s.id)} value={String(s.subdistrict_id || s.id)}>
                                         {s.subdistrict_name || s.name}
                                      </SelectItem>
                                   ))}
                                </SelectContent>
                             </Select>
                          </div>
                       </div>
                    </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="address_postal_code" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kode Pos</FormLabel>
                        <FormControl>
                          <Input placeholder="12xxx" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                 </div>

                 <FormField control={form.control} name="address_street" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alamat Lengkap (Jalan, No. Rumah)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Jl. Merpati No. 123, RT 01/RW 02..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                 )} />
               </>
             )}
          </CardContent>
        </Card>

        {/* 3. SOCIAL MEDIA SECTION */}
        <Card>
           <CardHeader>
              <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Media Sosial</CardTitle>
              <CardDescription>Tampilkan link media sosial di profil toko Anda.</CardDescription>
           </CardHeader>
           <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="instagram_url" render={({ field }) => (
                 <FormItem>
                   <FormLabel>Instagram URL</FormLabel>
                   <FormControl>
                     <RenderField field={field} placeholder="https://instagram.com/..." />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
              )} />
              <FormField control={form.control} name="tiktok_url" render={({ field }) => (
                 <FormItem>
                   <FormLabel>TikTok URL</FormLabel>
                   <FormControl>
                     <RenderField field={field} placeholder="https://tiktok.com/@..." />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
              )} />
              <FormField control={form.control} name="website_url" render={({ field }) => (
                 <FormItem>
                   <FormLabel>Website / LinkTree</FormLabel>
                   <FormControl>
                     <RenderField field={field} placeholder="https://..." />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
              )} />
           </CardContent>
        </Card>

        {/* 4. BANK SECTION */}
        <Card>
           <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Rekening Bank</CardTitle>
              <CardDescription>Informasi ini digunakan untuk pencairan dana penghasilan.</CardDescription>
           </CardHeader>
           <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField control={form.control} name="bank_name" render={({ field }) => (
                 <FormItem>
                   <FormLabel>Nama Bank</FormLabel>
                   <FormControl>
                     <RenderField field={field} placeholder="BCA / Mandiri" />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
              )} />
              <FormField control={form.control} name="bank_account_number" render={({ field }) => (
                 <FormItem>
                   <FormLabel>Nomor Rekening</FormLabel>
                   <FormControl>
                     <RenderField field={field} placeholder="1234567890" />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
              )} />
              <FormField control={form.control} name="bank_account_holder" render={({ field }) => (
                 <FormItem>
                   <FormLabel>Atas Nama</FormLabel>
                   <FormControl>
                     <RenderField field={field} placeholder="Nama Pemilik" />
                   </FormControl>
                   <FormMessage />
                 </FormItem>
              )} />
           </CardContent>
        </Card>
              
      </form>
    </Form>
  )
}