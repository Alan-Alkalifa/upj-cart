"use client"

import { useTransition, useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { productSchema } from "@/lib/dashboard-schemas"
import { createProduct, updateProduct, deleteProductVariant } from "./actions"
import { createClient } from "@/utils/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Trash2, Plus, Loader2, Upload, AlertTriangle } from "lucide-react"

// 1. Explicitly infer the type from the Schema
type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  categories: any[]
  orgId: string
  initialData?: any 
}

export function ProductForm({ categories, orgId, initialData }: ProductFormProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  
  // State for deletion handling
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [variantToDelete, setVariantToDelete] = useState<{ index: number; id?: string } | null>(null)

  const isEdit = !!initialData

  // 2. Form Initialization
  const form = useForm<ProductFormValues>({
    // FIX: Cast resolver to 'any' to bypass strict type check on Zod Coercion (String -> Number)
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      global_category_id: initialData?.global_category_id || "",
      base_price: initialData?.base_price || 0,
      weight_grams: initialData?.weight_grams || 100,
      image_url: initialData?.image_url || "",
      is_active: initialData?.is_active ?? true,
      variants: initialData?.product_variants || [{ name: "Standard", stock: 10, price_override: 0 }]
    }
  })

  // Dynamic Variants
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants"
  })

  // --- LOGIC: Handle Image Upload ---
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const supabase = createClient()
    const fileExt = file.name.split('.').pop()
    const filePath = `${orgId}/${Date.now()}.${fileExt}`

    const { error } = await supabase.storage.from('products').upload(filePath, file)
    
    if (error) {
      toast.error("Upload gagal: " + error.message)
      setUploading(false)
      return
    }

    const { data } = supabase.storage.from('products').getPublicUrl(filePath)
    form.setValue("image_url", data.publicUrl)
    setUploading(false)
    toast.success("Foto berhasil diupload")
  }

  // --- LOGIC: Prepare Deletion ---
  function onRemoveClick(index: number) {
    // Access the actual data to check for ID
    const currentVariants = form.getValues("variants")
    const currentVariant = currentVariants[index] as any // Cast to access potential ID
    const dbId = currentVariant?.id 

    setVariantToDelete({ index, id: dbId })
    setDeleteOpen(true)
  }

  // --- LOGIC: Confirm Deletion ---
  async function confirmDelete() {
    if (!variantToDelete) return

    const { index, id } = variantToDelete

    // 1. If it has an ID, perform SOFT DELETE via Server Action
    if (id) {
      startTransition(async () => {
        const res = await deleteProductVariant(id)
        if (res?.error) {
          toast.error("Gagal menghapus varian dari database")
        } else {
          remove(index) // Remove from UI on success
          toast.success("Varian dihapus")
          setDeleteOpen(false)
        }
      })
    } else {
      // 2. If it's a new row (unsaved), just remove from UI immediately
      remove(index)
      setDeleteOpen(false)
    }
  }

  // --- LOGIC: Submit Form ---
  function onSubmit(values: ProductFormValues) {
    startTransition(async () => {
      let res
      if (isEdit) {
        res = await updateProduct(initialData.id, values)
      } else {
        res = await createProduct(orgId, values)
      }

      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success(isEdit ? "Produk diperbarui!" : "Produk berhasil dibuat!")
        router.push("/dashboard/products")
      }
    })
  }
  
  // Data flow diagram for RHF + Zod to explain the fix
  // 

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-5xl">
          
          {/* HEADER */}
          <div className="flex items-center justify-between">
             <div>
               <h2 className="text-2xl font-bold tracking-tight">{isEdit ? "Edit Produk" : "Tambah Produk Baru"}</h2>
               <p className="text-muted-foreground text-sm">Isi detail produk, varian, dan stok.</p>
             </div>
             <div className="flex gap-2">
               <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
               <Button type="submit" disabled={isPending || uploading}>
                 {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                 {isEdit ? "Simpan Perubahan" : "Terbitkan Produk"}
               </Button>
             </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[2fr_1fr]">
            
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              
              {/* 1. Basic Info */}
              <Card>
                <CardHeader><CardTitle>Informasi Produk</CardTitle></CardHeader>
                <CardContent className="grid gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Nama Produk</FormLabel><FormControl><Input placeholder="Contoh: Kemeja PDH" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Deskripsi</FormLabel><FormControl><Textarea placeholder="Jelaskan spesifikasi produk..." className="min-h-32" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* 2. Variants */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Varian & Stok</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ name: "", stock: 0, price_override: 0 })}>
                    <Plus className="mr-2 h-4 w-4" /> Tambah Varian
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((fieldItem, index) => (
                    <div key={fieldItem.id} className="grid grid-cols-[2fr_1fr_1fr_auto] items-end gap-3 rounded-md border p-4 bg-muted/20">
                      
                      {/* Note: We don't render hidden input for ID here to avoid type conflicts with schema. 
                          We access ID directly from form.getValues() in onRemoveClick instead. */}

                      <FormField control={form.control} name={`variants.${index}.name`} render={({ field }) => (
                        <FormItem><FormLabel>Nama Varian</FormLabel><FormControl><Input placeholder="Size L / Merah" {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      
                      <FormField control={form.control} name={`variants.${index}.stock`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stok</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name={`variants.${index}.price_override`} render={({ field }) => (
                        <FormItem>
                          <FormLabel>Harga Khusus</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Opsional" 
                              {...field}
                              value={field.value ?? ""} 
                              onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      {/* BUTTON TRIGGERS ALERT DIALOG */}
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => onRemoveClick(index)}
                        disabled={fields.length === 1 || isPending} 
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
              
              {/* 3. Status & Organization */}
              <Card>
                <CardHeader><CardTitle>Status</CardTitle></CardHeader>
                <CardContent className="grid gap-4">
                  <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Aktifkan Produk</FormLabel>
                        <FormDescription>Produk akan tampil di katalog.</FormDescription>
                      </div>
                      <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* 4. Details */}
              <Card>
                <CardHeader><CardTitle>Detail</CardTitle></CardHeader>
                <CardContent className="grid gap-4">
                  <FormField control={form.control} name="base_price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Dasar (Rp)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="weight_grams" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Berat (Gram)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field} 
                          onChange={e => field.onChange(e.target.valueAsNumber || 0)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="global_category_id" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Pilih Kategori" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {categories.length === 0 ? (
                             <SelectItem value="disabled" disabled>Tidak ada kategori (Cek DB)</SelectItem>
                          ) : (
                            categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
              </Card>

              {/* 5. Image Upload */}
              <Card>
                <CardHeader><CardTitle>Foto Produk</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                   <div className="flex justify-center rounded-lg border border-dashed p-6">
                      {form.watch("image_url") ? (
                        <div className="relative aspect-square w-full max-w-[200px] overflow-hidden rounded-md">
                          <Avatar className="h-full w-full rounded-none">
                             <AvatarImage src={form.watch("image_url")} className="object-cover" />
                             <AvatarFallback className="rounded-none">Img</AvatarFallback>
                          </Avatar>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="h-8 w-8" />
                          <span className="text-xs">Upload Foto</span>
                        </div>
                      )}
                   </div>
                   <Input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>

      {/* ALERT DIALOG FOR DELETION */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
               <AlertTriangle className="h-5 w-5" /> Hapus Varian?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {variantToDelete?.id 
                ? "Varian ini akan di-arsipkan (Soft Delete). Data tidak akan hilang dari riwayat pesanan, tetapi tidak akan muncul lagi di stok."
                : "Varian ini belum disimpan dan akan dihapus dari daftar."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault() 
                confirmDelete()
              }} 
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ya, Hapus"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}