"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  loginSchema,
  registerSchema,
  merchantRegisterSchema,
  forgotPasswordSchema,
  updatePasswordSchema,
} from "@/lib/auth-schemas";
import { z } from "zod";
import { cookies } from "next/headers";

const isProduction = process.env.NODE_ENV === "production";
const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// --- 1. LOGIN ---
export async function login(values: z.infer<typeof loginSchema>) {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) {
    if (error.message.includes("Email not confirmed")) {
      return {
        error: "Email not verified.",
        code: "email_not_verified",
      };
    }
    return { error: error.message };
  }

  // Check Role
  const [profileRes, memberRes] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", data.user.id).single(),
    supabase
      .from("organization_members")
      .select("id")
      .eq("profile_id", data.user.id)
      .maybeSingle(),
  ]);

  const role = profileRes.data?.role;
  const isMerchant = !!memberRes.data;

  let redirectUrl = "/";
  if (role === "super_admin") {
    redirectUrl = "/admin-dashboard";
  } else if (isMerchant) {
    redirectUrl = "/merchant-dashboard";
  }

  return { success: true, redirectUrl };
}

// --- 2. BUYER SIGNUP (Supabase Native) ---
export async function signup(values: z.infer<typeof registerSchema>) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  // 1. Manual Check (Prevent Enumeration)
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", values.email)
    .maybeSingle();

  if (existingProfile) {
    return { error: "Email already used." };
  }

  // 2. SignUp (Triggers Supabase Auto-Email)
  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.fullName },
      emailRedirectTo: `${origin}/callback`, // Redirects here after clicking email link
    },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      return { error: "Email already used." };
    }
    return { error: error.message };
  }

  // 3. Set Cookie
  (await cookies()).set("pending_verification_signup", "true", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

  return { success: true };
}

// --- 3. MERCHANT REGISTRATION (Supabase Native) ---
export async function registerMerchant(
  values: z.infer<typeof merchantRegisterSchema>
) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const validatedFields = merchantRegisterSchema.safeParse(values);
  
  if (!validatedFields.success) {
    return { 
      error: "Data tidak valid. Pastikan email menggunakan domain @upj.ac.id dan format lainnya sesuai." 
    };
  }

  // Gunakan data yang sudah terverifikasi aman
  const data = validatedFields.data;

  // 1. Guard: User must be logged out
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return { error: "Anda sudah login. Silakan logout terlebih dahulu." };

  // 2. Check Existing User
  const { data: existingUser } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", data.email) 
    .maybeSingle();

  if (existingUser) {
    return { error: "Email sudah terdaftar." };
  }

  const { data: existingSlug } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", data.storeSlug)
    .single();

  if (existingSlug) return { error: "URL Toko (Slug) sudah digunakan." };

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.fullName },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/merchant-dashboard`,
    },
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Gagal membuat user." };

  // 5. RPC Transaction
  const { error: rpcError } = await supabaseAdmin.rpc(
    "register_merchant_transaction",
    {
      p_user_id: authData.user.id,
      p_email: data.email,
      p_full_name: data.fullName,
      p_store_name: data.storeName,
      p_store_slug: data.storeSlug,
      p_store_desc: data.description || "",
    }
  );

  if (rpcError) {
    console.error("RPC Error:", rpcError);
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: "Gagal membuat data toko. Silakan coba lagi." };
  }

  return { success: true };
}

// --- 4. RESEND VERIFICATION EMAIL (Supabase Native) ---
export async function resendVerificationEmail(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email,
    options: { emailRedirectTo: `${origin}/callback` },
  });

  if (error) return { error: error.message };
  return { success: true };
}

// --- 5. FORGOT PASSWORD (Supabase Native) ---
export async function forgotPassword(
  values: z.infer<typeof forgotPasswordSchema>
) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
    redirectTo: `${origin}/callback?next=/update-password`,
  });

  if (error) return { error: error.message };
  (await cookies()).set("pending_verification_reset", "true", {
    path: "/update-password",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

  return { success: true };
}

export async function updatePassword(values: z.infer<typeof updatePasswordSchema>) {
  const supabase = await createClient();

  // Validate fields on server side as well
  const validatedFields = updatePasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  const { password } = validatedFields.data;

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return { error: error.message };
  }

  // Do NOT redirect here. Return success so the client shows the toast and redirects.
  return { success: true };
}