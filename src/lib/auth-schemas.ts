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
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Register Buyer Schema (Nama & Password ketat)
export const registerSchema = z.object({
  fullName: z
    .string()
    .min(3, { message: "Name must be at least 3 characters" })
    .regex(nameValidation, { message: "Name can only contain letters and spaces" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[a-z]/, { message: "Must contain a lowercase letter" })
    .regex(/[A-Z]/, { message: "Must contain an uppercase letter" })
    .regex(/[0-9]/, { message: "Must contain a number" })
    .regex(/[^a-zA-Z0-9]/, { message: "Must contain a symbol (e.g. !@#$)" }),
  confirmPassword: z.string().min(1, { message: "Confirm password is required" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Merchant Register Schema (Sangat Spesifik)
export const merchantRegisterSchema = z.object({
  // 1. Owner Info
  fullName: z
    .string()
    .min(3, { message: "Name must be at least 3 characters" })
    .regex(nameValidation, { message: "Name can only contain letters and spaces" }),
    
  // 2. Email Kampus (Wajib domain upj.ac.id)
  email: z
    .string()
    .email({ message: "Invalid email address" })
    .refine((val) => val.endsWith("upj.ac.id"), {
      message: "Must use a campus email (*.upj.ac.id)",
    }),

  // 3. Password Ketat
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[a-z]/, { message: "Must contain a lowercase letter" })
    .regex(/[A-Z]/, { message: "Must contain an uppercase letter" })
    .regex(/[0-9]/, { message: "Must contain a number" })
    .regex(/[^a-zA-Z0-9]/, { message: "Must contain a symbol (e.g. !@#$)" }),
    
  confirmPassword: z.string().min(1, { message: "Confirm password is required" }),

  // 4. Store Info
  storeName: z
    .string()
    .min(3, { message: "Store name must be at least 3 characters" })
    .regex(storeNameValidation, { message: "Store name cannot contain symbols" }),

  // 5. URL Toko (Tanpa Spasi)
  storeSlug: z
    .string()
    .min(3, { message: "Slug must be at least 3 characters" })
    .regex(/^[a-z0-9-]+$/, {
      message: "URL can only contain lowercase letters, numbers, and hyphens (no spaces)",
    }),

  // 6. Deskripsi (Max 200 Kata)
  description: z
    .string()
    .optional()
    .refine((val) => !val || countWords(val) <= 200, {
      message: "Description cannot exceed 200 words",
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Forgot Password
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
});

// Update Password
export const updatePasswordSchema = z.object({
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/[a-z]/, { message: "Must contain a lowercase letter" })
    .regex(/[A-Z]/, { message: "Must contain an uppercase letter" })
    .regex(/[0-9]/, { message: "Must contain a number" })
    .regex(/[^a-zA-Z0-9]/, { message: "Must contain a symbol (e.g. !@#$)" }),
  confirmPassword: z.string().min(1, { message: "Confirm password is required" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});