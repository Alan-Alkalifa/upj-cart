import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export const registerSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
})

export const merchantRegisterSchema = z.object({
  fullName: z.string().min(3, "Nama lengkap minimal 3 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  storeName: z.string().min(3, "Nama toko minimal 3 karakter"),
  storeSlug: z.string().min(3, "URL toko minimal 3 karakter")
    .regex(/^[a-z0-9-]+$/, "URL hanya boleh huruf kecil, angka, dan strip (-)"),
  description: z.string().optional(),
})