import { createClient } from "@/utils/supabase/server"
import { ProductForm } from "../product-form"
import { redirect } from "next/navigation"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Ambil Produk beserta Variannya terlebih dahulu untuk mendapatkan org_id
  const { data: product } = await supabase
    .from("products")
    .select("*, product_variants(*)") // Ambil semua varian
    .eq("id", id)
    .single()

  if (!product) redirect("/merchant-dashboard/products")

  const orgId = product.org_id

  // 2. Ambil Global Categories (System)
  const { data: categories } = await supabase
    .from("global_categories")
    .select("*")
    .order("name", { ascending: true })

  // 3. Ambil Merchant Categories (Spesifik Toko & Tidak Terhapus)
  const { data: merchantCategories } = await supabase
    .from("merchant_categories")
    .select("*")
    .eq("org_id", orgId)
    .is("deleted_at", null) // Filter Soft Delete
    .order("name", { ascending: true })

  // --- FILTERING LOGIC (SANGAT PENTING) ---
  // Kita harus membuang varian yang memiliki deleted_at tidak null
  // agar tidak muncul di form edit.
  if (product.product_variants) {
    product.product_variants = product.product_variants.filter(
      (v: any) => v.deleted_at === null
    )
  }

  return (
    <div className="space-y-6">
      <ProductForm 
        categories={categories || []} 
        merchantCategories={merchantCategories || []}
        orgId={orgId} 
        initialData={product} // Data yang dikirim sudah bersih dari soft-deleted items
      />
    </div>
  )
}