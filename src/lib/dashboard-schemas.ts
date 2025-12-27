import { z } from "zod"

// 1. General & Finance Settings
export const storeSettingsSchema = z.object({
  name: z.string().min(3, "Nama toko minimal 3 karakter"),
  description: z.string().optional(),
  address_street: z.string().optional(),
  logo_url: z.string().optional(),   // New
  banner_url: z.string().optional(), // New
  
  // Finance
  bank_name: z.string().min(2, "Nama bank wajib diisi"),
  bank_account_number: z.string().min(5, "Nomor rekening wajib diisi"),
  bank_account_holder: z.string().min(3, "Atas nama wajib diisi"),
})

// 2. Staff Management
export const inviteStaffSchema = z.object({
  email: z.string()
    .email("Email tidak valid")
    .endsWith("@student.upj.ac.id", "Staff harus menggunakan email @student.upj.ac.id"),
})

export const productSchema = z.object({
  name: z.string()
    .min(3, "Nama produk minimal 3 karakter")
    .max(25, "Nama produk maksimal 25 karakter"), // MAX 25 CHAR
  
  description: z.string()
    .max(500, "Deskripsi maksimal 500 karakter") // MAX 500 CHAR
    .optional(),
  
  global_category_id: z.string().min(1, "Kategori wajib dipilih"),
  
  base_price: z.coerce.number().min(100, "Harga minimal Rp 100"),
  
  weight_grams: z.coerce.number()
    .min(1, "Berat minimal 1 gram")
    .max(100000, "Berat maksimal 100 kg"), // MAX 100KG (100000g)
  
  image_url: z.string().optional(),
  is_active: z.boolean().default(true),
  
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Nama varian wajib"),
    stock: z.coerce.number().min(0, "Stok tidak boleh minus"),
    price_override: z.coerce.number().optional(),
  })).min(1, "Minimal 1 varian (misal: 'Standard')"),
})

export const organizationSchema = z.object({
  name: z.string().min(3, "Nama toko minimal 3 karakter"),
  slug: z.string().min(3, "Slug minimal 3 karakter").regex(/^[a-z0-9-]+$/, "Hanya huruf kecil, angka, dan strip"),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  banner_url: z.string().optional(), // New
  
  // Social Media
  website_url: z.string().optional(),
  instagram_url: z.string().optional(),
  tiktok_url: z.string().optional(),

  // Address
  address_street: z.string().optional(),
  address_district: z.string().optional(),
  address_city: z.string().optional(),
  address_postal_code: z.string().optional(),

  // Bank
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_account_holder: z.string().optional(),
})

