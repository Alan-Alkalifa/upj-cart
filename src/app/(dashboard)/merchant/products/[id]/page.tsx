import { createClient } from "@/utils/supabase/server"
import { ProductForm } from "../product-form"
import { redirect } from "next/navigation"

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  // 1. Ambil Kategori
  const { data: categories } = await supabase.from("global_categories").select("*")

  // 2. Ambil Produk beserta Variannya
  const { data: product } = await supabase
    .from("products")
    .select("*, product_variants(*)") // Ambil semua varian dulu
    .eq("id", id)
    .single()

  if (!product) redirect("/merchant/products")

  // --- FILTERING LOGIC (SANGAT PENTING) ---
  // Kita harus membuang varian yang memiliki deleted_at tidak null
  // agar tidak muncul di form edit.
  if (product.product_variants) {
    product.product_variants = product.product_variants.filter(
      (v: any) => v.deleted_at === null
    )
  }

  // Ambil Org ID dari session/produk (tergantung struktur DB anda)
  // Asumsi produk punya org_id
  const orgId = product.org_id 

  return (
    <div className="space-y-6">
      <ProductForm 
        categories={categories || []} 
        orgId={orgId} 
        initialData={product} // Data yang dikirim sudah bersih dari soft-deleted items
      />
    </div>
  )
}