"use client";

import { useTransition, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/lib/dashboard-schemas";
import { createProduct, updateProduct, deleteProductVariant } from "./actions";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2, Plus, Loader2, Upload, AlertTriangle, X } from "lucide-react";

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductFormProps {
  categories: any[];         // Global Categories
  merchantCategories: any[]; // Merchant Specific Categories
  orgId: string;
  initialData?: any;
}

export function ProductForm({
  categories,
  merchantCategories,
  orgId,
  initialData,
}: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  // State for deletion handling
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [variantToDelete, setVariantToDelete] = useState<{
    index: number;
    id?: string;
  } | null>(null);

  const isEdit = !!initialData;

  // 2. Form Initialization
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      global_category_id: initialData?.global_category_id || "",
      merchant_category_id: initialData?.merchant_category_id || "", 
      base_price: initialData?.base_price || 0,
      weight_grams: initialData?.weight_grams || 100,
      image_url: initialData?.image_url || "",
      gallery_urls:
        initialData?.gallery_urls && initialData.gallery_urls.length > 0
          ? initialData.gallery_urls
          : initialData?.image_url
          ? [initialData.image_url]
          : [],
      is_active: initialData?.is_active ?? true,
      variants: initialData?.product_variants || [
        { name: "Standard", stock: 10, price_override: 0 },
      ],
    },
  });

  // Dynamic Variants
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
  });

  // --- LOGIC: Handle Multiple Image Upload ---
  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const supabase = createClient();
    const newUrls: string[] = [];

    // Loop through all selected files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileExt = file.name.split(".").pop();
      const filePath = `${orgId}/${Date.now()}-${i}.${fileExt}`;

      const { error } = await supabase.storage
        .from("products")
        .upload(filePath, file);

      if (!error) {
        const { data } = supabase.storage
          .from("products")
          .getPublicUrl(filePath);
        newUrls.push(data.publicUrl);
      }
    }

    const currentGallery = form.getValues("gallery_urls") || [];
    const updatedGallery = [...currentGallery, ...newUrls];

    form.setValue("gallery_urls", updatedGallery);

    if (updatedGallery.length > 0) {
      form.setValue("image_url", updatedGallery[0]);
    }

    setUploading(false);
    if (newUrls.length > 0)
      toast.success(`${newUrls.length} foto berhasil diupload`);
  }

  // --- LOGIC: Remove Image ---
  function removeImage(indexToRemove: number) {
    const currentGallery = form.getValues("gallery_urls") || [];
    const updatedGallery = currentGallery.filter(
      (_, idx) => idx !== indexToRemove
    );

    form.setValue("gallery_urls", updatedGallery);

    if (updatedGallery.length > 0) {
      form.setValue("image_url", updatedGallery[0]);
    } else {
      form.setValue("image_url", "");
    }
  }

  // --- LOGIC: Prepare Deletion ---
  function onRemoveClick(index: number) {
    const currentVariants = form.getValues("variants");
    const currentVariant = currentVariants[index] as any;
    const dbId = currentVariant?.id;

    setVariantToDelete({ index, id: dbId });
    setDeleteOpen(true);
  }

  // --- LOGIC: Confirm Deletion ---
  async function confirmDelete() {
    if (!variantToDelete) return;

    const { index, id } = variantToDelete;

    if (id) {
      startTransition(async () => {
        const res = await deleteProductVariant(id);
        if (res?.error) {
          toast.error("Gagal menghapus varian dari database");
        } else {
          remove(index);
          toast.success("Varian dihapus");
          setDeleteOpen(false);
        }
      });
    } else {
      remove(index);
      setDeleteOpen(false);
    }
  }

  // --- LOGIC: Submit Form ---
  function onSubmit(values: ProductFormValues) {
    startTransition(async () => {
      let res;
      if (isEdit) {
        res = await updateProduct(initialData.id, values);
      } else {
        res = await createProduct(orgId, values);
      }

      if (res?.error) {
        toast.error(res.error);
      } else {
        toast.success(
          isEdit ? "Produk diperbarui!" : "Produk berhasil dibuat!"
        );
        router.push("/merchant-dashboard/products");
      }
    });
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* HEADER */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                {isEdit ? "Edit Produk" : "Tambah Produk Baru"}
              </h2>
              <p className="text-muted-foreground text-sm">
                Isi detail produk, varian, dan stok.
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="flex-1 sm:flex-none"
                onClick={() => router.back()}
              >
                Batal
              </Button>
              <Button 
                type="submit" 
                className="flex-1 sm:flex-none" 
                disabled={isPending || uploading}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEdit ? "Simpan" : "Terbitkan"}
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
              {/* 1. Basic Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Informasi Produk</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nama Produk</FormLabel>
                        <FormControl>
                          <Input placeholder="Contoh: Kemeja PDH" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Deskripsi</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Jelaskan spesifikasi produk..."
                            className="min-h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 2. Variants */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Varian & Stok</CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      append({ name: "", stock: 0, price_override: 0 })
                    }
                  >
                    <Plus className="mr-2 h-4 w-4" /> Tambah Varian
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {fields.map((fieldItem, index) => (
                    <div
                      key={fieldItem.id}
                      className="flex flex-col gap-4 rounded-md border p-4 bg-muted/20 sm:grid sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-start sm:gap-3"
                    >
                      <FormField
                        control={form.control}
                        name={`variants.${index}.name`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="sm:hidden lg:block">Nama Varian</FormLabel>
                            <FormControl>
                              <Input placeholder="Size L / Merah" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`variants.${index}.stock`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="sm:hidden lg:block">Stok</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(e.target.valueAsNumber || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`variants.${index}.price_override`}
                        render={({ field }) => (
                          <FormItem className="w-full">
                            <FormLabel className="sm:hidden lg:block">Harga Khusus</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="Opsional"
                                {...field}
                                value={field.value ?? ""}
                                onChange={(e) =>
                                  field.onChange(e.target.valueAsNumber || 0)
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveClick(index)}
                        disabled={fields.length === 1 || isPending}
                        className="text-destructive mt-auto sm:mt-8"
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
              {/* 3. Status */}
              <Card>
                <CardHeader>
                  <CardTitle>Status</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <FormField
                    control={form.control}
                    name="is_active"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Aktifkan Produk</FormLabel>
                          <FormDescription>
                            Produk akan tampil di katalog.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 4. Details & Categories */}
              <Card>
                <CardHeader>
                  <CardTitle>Detail & Kategori</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                   {/* Global Category & Merchant Category - Side by Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {/* Global Category */}
                     <FormField
                      control={form.control}
                      name="global_category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori Global</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih Kategori" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {categories.length === 0 ? (
                                <SelectItem value="disabled" disabled>
                                  Tidak ada data
                                </SelectItem>
                              ) : (
                                categories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Merchant Category */}
                    <FormField
                      control={form.control}
                      name="merchant_category_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Kategori Toko</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value || undefined}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Pilih Kategori" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {merchantCategories.length === 0 ? (
                                <SelectItem value="empty" disabled>
                                  Belum ada kategori
                                </SelectItem>
                              ) : (
                                merchantCategories.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="base_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Harga Dasar (Rp)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.valueAsNumber || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weight_grams"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Berat (Gram)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) =>
                              field.onChange(e.target.valueAsNumber || 0)
                            }
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 5. Image Upload - Moved to Bottom (Full Width) */}
          <Card>
            <CardHeader>
              <CardTitle>Galeri Foto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                {/* Render existing images */}
                {form.watch("gallery_urls")?.map((url, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden border group bg-muted"
                  >
                    <img
                      src={url}
                      alt="Product"
                      className="w-full h-full object-cover"
                    />

                    {/* Main Badge */}
                    {index === 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[10px] text-center py-1">
                        Cover
                      </div>
                    )}

                    {/* Remove Button */}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 bg-white/80 p-1 rounded-full text-red-600 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {/* Upload Button */}
                <label className="flex flex-col items-center justify-center aspect-square rounded-md border border-dashed hover:bg-muted/50 cursor-pointer transition-colors">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {uploading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <Upload className="h-6 w-6" />
                    )}
                    <span className="text-xs text-center px-2">
                      {uploading ? "Uploading..." : "Tambah Foto"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                Foto pertama akan menjadi cover produk.
              </p>
            </CardContent>
          </Card>
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
                : "Varian ini belum disimpan dan akan dihapus dari daftar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Ya, Hapus"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}