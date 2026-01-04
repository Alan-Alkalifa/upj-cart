import { z } from "zod"

// 1. General & Finance Settings
export const storeSettingsSchema = z.object({
  name: z.string().min(3, "Store name must be at least 3 characters"),
  description: z.string().optional(),
  address_street: z.string().optional(),
  logo_url: z.string().optional(),
  banner_url: z.string().optional(),
  
  // Finance
  bank_name: z.string().min(2, "Bank name is required"),
  bank_account_number: z.string().min(5, "Account number is required"),
  bank_account_holder: z.string().min(3, "Account holder name is required"),
})

// 2. Staff Management
export const inviteStaffSchema = z.object({
  email: z.string()
    .email("Invalid email address")
    .endsWith("upj.ac.id", "Staff must use an name@upj.ac.id email"),
})

export const productSchema = z.object({
  name: z.string()
    .min(3, "Product name must be at least 3 characters")
    .max(25, "Product name cannot exceed 25 characters"),
  
  description: z.string()
    .max(500, "Description cannot exceed 500 characters")
    .optional(),
  
  global_category_id: z.string().min(1, "Category is required"),
  
  merchant_category_id: z.string().optional(),
  
  base_price: z.coerce.number().min(100, "Price must be at least Rp 100"),
  
  weight_grams: z.coerce.number()
    .min(1, "Weight must be at least 1 gram")
    .max(100000, "Weight cannot exceed 100 kg"),
  
  image_url: z.string().optional(),
  gallery_urls: z.array(z.string()).optional(),

  is_active: z.boolean().default(true),
  
  variants: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1, "Variant name is required"),
    stock: z.coerce.number().min(0, "Stock cannot be negative"),
    price_override: z.coerce.number().optional(),
  })).min(1, "At least 1 variant is required (e.g., 'Standard')"),
})

export const organizationSchema = z.object({
  name: z.string().min(3, "Store name must be at least 3 characters"),
  slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  description: z.string().optional(),
  logo_url: z.string().optional(),
  banner_url: z.string().optional(),
  
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