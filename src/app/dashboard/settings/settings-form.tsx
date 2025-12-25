"use client"

import { useState, useTransition } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { organizationSchema } from "@/lib/dashboard-schemas"
import { updateOrganization } from "./actions"
import { createClient } from "@/utils/supabase/client"
import { z } from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, Upload, ImageIcon, MapPin, Globe, CreditCard } from "lucide-react"

export function SettingsForm({ initialData }: { initialData: any }) {
  const [isPending, startTransition] = useTransition()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

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

      bank_name: initialData.bank_name || "",
      bank_account_number: initialData.bank_account_number || "",
      bank_account_holder: initialData.bank_account_holder || "",
    }
  })

  // --- UPLOAD HANDLER (Reused for Logo & Banner) ---
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>, fieldName: "logo_url" | "banner_url") {
    const file = e.target.files?.[0]
    if (!file) return

    const isBanner = fieldName === "banner_url"
    if (isBanner) setUploadingBanner(true)
    else setUploadingLogo(true)

    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const fileName = `${initialData.id}/${fieldName}_${Date.now()}.${fileExt}`

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
      const res = await updateOrganization(initialData.id, values)
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success("Pengaturan disimpan!")
      }
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pb-10">
        
        {/* 1. IDENTITY SECTION */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" /> Identitas Toko</CardTitle>
            <CardDescription>Logo, banner, dan deskripsi profil toko Anda.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Logo & Banner Grid */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Logo Upload */}
              <div className="flex flex-col gap-3">
                <FormLabel>Logo Toko</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-20 w-20 border">
                    <AvatarImage src={form.watch("logo_url")} className="object-cover" />
                    <AvatarFallback>LG</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Input 
                      type="file" 
                      accept="image/*" 
                      disabled={uploadingLogo} 
                      onChange={(e) => handleUpload(e, "logo_url")} 
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Format: JPG, PNG. Max 2MB.</p>
                  </div>
                </div>
              </div>

              {/* Banner Upload */}
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
                   <Input 
                      type="file" 
                      accept="image/*" 
                      disabled={uploadingBanner} 
                      onChange={(e) => handleUpload(e, "banner_url")} 
                    />
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nama Toko</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="slug" render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (Link Toko)</FormLabel>
                  <FormControl><Input {...field} disabled /></FormControl>
                  <FormDescription>Slug dibuat saat registrasi dan tidak bisa diubah.</FormDescription>
                </FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Deskripsi Singkat</FormLabel>
                <FormControl><Textarea placeholder="Ceritakan tentang toko Anda..." className="min-h-[100px]" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
          </CardContent>
        </Card>

        {/* 2. ADDRESS SECTION */}
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2"><MapPin className="h-5 w-5" /> Alamat Toko</CardTitle>
             <CardDescription>Alamat ini akan digunakan untuk titik penjemputan kurir.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <FormField control={form.control} name="address_street" render={({ field }) => (
                <FormItem><FormLabel>Alamat Lengkap (Jalan, No. Rumah)</FormLabel><FormControl><Textarea placeholder="Jl. Contoh No. 123..." {...field} /></FormControl><FormMessage /></FormItem>
             )} />
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField control={form.control} name="address_district" render={({ field }) => (
                  <FormItem><FormLabel>Kecamatan</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address_city" render={({ field }) => (
                  <FormItem><FormLabel>Kota/Kabupaten</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="address_postal_code" render={({ field }) => (
                  <FormItem><FormLabel>Kode Pos</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
             </div>
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
                 <FormItem><FormLabel>Instagram URL</FormLabel><FormControl><Input placeholder="https://instagram.com/..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="tiktok_url" render={({ field }) => (
                 <FormItem><FormLabel>TikTok URL</FormLabel><FormControl><Input placeholder="https://tiktok.com/@..." {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="website_url" render={({ field }) => (
                 <FormItem><FormLabel>Website / LinkTree</FormLabel><FormControl><Input placeholder="https://..." {...field} /></FormControl><FormMessage /></FormItem>
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
                 <FormItem><FormLabel>Nama Bank</FormLabel><FormControl><Input placeholder="BCA / Mandiri / BNI" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bank_account_number" render={({ field }) => (
                 <FormItem><FormLabel>Nomor Rekening</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="bank_account_holder" render={({ field }) => (
                 <FormItem><FormLabel>Atas Nama</FormLabel><FormControl><Input placeholder="Nama Pemilik Rekening" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
           </CardContent>
        </Card>

        <div className="flex justify-end bottom-4">
           <Button type="submit" size="lg" className="shadow-lg" disabled={isPending || uploadingLogo || uploadingBanner}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Perubahan
           </Button>
        </div>

      </form>
    </Form>
  )
}