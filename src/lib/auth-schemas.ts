import { z } from "zod";

// --- VALIDATION REGEX & HELPERS ---

// 1. Password: Min 8 char, uppercase, lowercase, number, symbol
const passwordValidation = new RegExp(
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,}$/
);

// 2. Nama Orang: Hanya Huruf dan Spasi
const nameValidation = new RegExp(/^[a-zA-Z\s]+$/);

// 3. Nama Toko: Huruf, Angka, Spasi (Tanpa Simbol aneh)
const storeNameValidation = new RegExp(/^[a-zA-Z0-9\s]+$/);

// 4. Helper untuk hitung kata
function countWords(str: string) {
  return str.trim().split(/\s+/).length;
}

// --- SCHEMAS ---

// Login Schema
export const loginSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
  password: z.string().min(1, { message: "Password wajib diisi" }),
});

// Register Buyer Schema (Nama & Password ketat)
export const registerSchema = z.object({
  fullName: z
    .string()
    .min(3, { message: "Nama minimal 3 karakter" })
    .regex(nameValidation, { message: "Nama hanya boleh berisi huruf dan spasi" }),
  email: z.string().email({ message: "Email tidak valid" }),
  password: z
    .string()
    .min(8, { message: "Password minimal 8 karakter" })
    .regex(/[a-z]/, { message: "Harus ada huruf kecil" })
    .regex(/[A-Z]/, { message: "Harus ada huruf besar" })
    .regex(/[0-9]/, { message: "Harus ada angka" })
    .regex(/[^a-zA-Z0-9]/, { message: "Harus ada simbol (contoh: !@#$)" }),
  confirmPassword: z.string().min(1, { message: "Konfirmasi password wajib diisi" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

// Merchant Register Schema (Sangat Spesifik)
export const merchantRegisterSchema = z.object({
  // 1. Owner Info
  fullName: z
    .string()
    .min(3, { message: "Nama minimal 3 karakter" })
    .regex(nameValidation, { message: "Nama hanya boleh berisi huruf dan spasi" }),
    
  // 2. Email Kampus (Wajib domain upj.ac.id)
  email: z
    .string()
    .email({ message: "Email tidak valid" })
    .refine((val) => val.endsWith("upj.ac.id"), {
      message: "Wajib menggunakan email kampus (*.upj.ac.id)",
    }),

  // 3. Password Ketat
  password: z
    .string()
    .min(8, { message: "Password minimal 8 karakter" })
    .regex(/[a-z]/, { message: "Harus ada huruf kecil" })
    .regex(/[A-Z]/, { message: "Harus ada huruf besar" })
    .regex(/[0-9]/, { message: "Harus ada angka" })
    .regex(/[^a-zA-Z0-9]/, { message: "Harus ada simbol (contoh: !@#$)" }),
    
  confirmPassword: z.string().min(1, { message: "Konfirmasi password wajib diisi" }),

  // 4. Store Info
  storeName: z
    .string()
    .min(3, { message: "Nama toko minimal 3 karakter" })
    .regex(storeNameValidation, { message: "Nama toko tidak boleh mengandung simbol" }),

  // 5. URL Toko (Tanpa Spasi)
  storeSlug: z
    .string()
    .min(3, { message: "Slug minimal 3 karakter" })
    .regex(/^[a-z0-9-]+$/, {
      message: "URL hanya boleh huruf kecil, angka, dan strip (tanpa spasi)",
    }),

  // 6. Deskripsi (Max 200 Kata)
  description: z
    .string()
    .optional()
    .refine((val) => !val || countWords(val) <= 200, {
      message: "Deskripsi maksimal 200 kata",
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});

// Forgot Password
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Email tidak valid" }),
});

// Update Password
export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password minimal 8 karakter" })
    .regex(/[a-z]/, { message: "Harus ada huruf kecil" })
    .regex(/[A-Z]/, { message: "Harus ada huruf besar" })
    .regex(/[0-9]/, { message: "Harus ada angka" })
    .regex(/[^a-zA-Z0-9]/, { message: "Harus ada simbol (contoh: !@#$)" }),
  confirmPassword: z.string().min(1, { message: "Konfirmasi password wajib diisi" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Password tidak cocok",
  path: ["confirmPassword"],
});