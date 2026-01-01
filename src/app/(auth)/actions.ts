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
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { cookies } from "next/headers";

const resend = new Resend(process.env.RESEND_API_KEY);
// Cek environment untuk keamanan cookie (Secure di Production)
const isProduction = process.env.NODE_ENV === "production";

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

  // 2. Cek Role
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

  // 3. Return URL Redirect (JANGAN redirect() di sini)
  let redirectUrl = "/";
  if (role === "super_admin") {
    redirectUrl = "/admin";
  } else if (isMerchant) {
    redirectUrl = "/merchant";
  }

  return { success: true, redirectUrl };
}

// --- 2. BUYER SIGNUP (Update: Manual Check) ---
export async function signup(values: z.infer<typeof registerSchema>) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient(); // Gunakan admin untuk cek database
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // --- LANGKAH BARU: CEK EMAIL MANUAL ---
  // Karena "Prevent Email Enumeration" aktif, kita cek manual ke tabel profiles
  // untuk memastikan email belum terdaftar.
  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", values.email)
    .maybeSingle();

  if (existingProfile) {
    return { error: "Email already used." };
  }
  // ---------------------------------------

  // SignUp standar
  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.fullName },
      emailRedirectTo: `${origin}/callback`,
    },
  });

  if (error) {
    // Backup check jika Supabase mengembalikan error spesifik
    if (error.message.includes("User already registered")) {
      return { error: "Email already used." };
    }
    return { error: error.message };
  }

  // Set Cookie akses sementara ke halaman verify
  (await cookies()).set("pending_verification_signup", "true", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300, // 5 Menit
  });

  return { success: true };
}

// --- 3. MERCHANT REGISTRATION ---
export async function registerMerchant(
  values: z.infer<typeof merchantRegisterSchema>
) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();

  // Guard: Pastikan user sedang logout
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) return { error: "You are already logged in. Please log out first." };

  // --- LOGIKA BARU: CEK APAKAH SUDAH JADI BUYER? ---
  const { data: existingUser } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("email", values.email)
    .maybeSingle();

  if (existingUser) {
    if (existingUser.role === "buyer") {
      return { 
        error: "Email already registered as a Buyer. Cannot register again as Merchant." 
      };
    } else {
      return { error: "Email already used." };
    }
  }
  // ------------------------------------------------

  // 1. Cek Ketersediaan Slug Toko
  const { data: existingSlug } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", values.storeSlug)
    .single();

  if (existingSlug) return { error: "Merchant URL already used." };

  // 2. Create Auth User (Admin API)
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: values.email,
      password: values.password,
      email_confirm: false, 
      user_metadata: { full_name: values.fullName },
    });

  if (authError) {
    if (authError.message.includes("User already registered")) {
      return { error: "Email already used." };
    }
    return { error: authError.message };
  }

  if (!authData.user) return { error: "Failed to create user." };

  // 3. RPC Transaction
  const { error: rpcError } = await supabaseAdmin.rpc(
    "register_merchant_transaction",
    {
      p_user_id: authData.user.id,
      p_email: values.email,
      p_full_name: values.fullName,
      p_store_name: values.storeName,
      p_store_slug: values.storeSlug,
      p_store_desc: values.description || "",
    }
  );

  if (rpcError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    console.error("RPC Error:", rpcError);
    return { error: "Failed to create store. Database issue." };
  }

  // --- KIRIM EMAIL (Resend) ---
  try {
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "signup",
        email: values.email,
        password: values.password,
        options: {
          redirectTo: "http://localhost:3000/merchant",
        },
      });

    if (linkError) throw linkError;

    const verificationLink = linkData.properties.action_link;

    await resend.emails.send({
      from: "UPJ CART <hi@the-candils.com>",
      to: values.email,
      subject: "Verifikasi Email Toko Anda",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Selamat Datang di UPJ Cart!</h1>
          <p>Halo <b>${values.fullName}</b>,</p>
          <p>Toko <b>${values.storeName}</b> berhasil dibuat. Tinggal satu langkah lagi!</p>
          <p>Klik tombol di bawah ini untuk memverifikasi email Anda dan mulai berjualan:</p>
          <div style="margin: 20px 0;">
            <a href="${verificationLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
              Verifikasi Email Sekarang
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Jika tombol tidak berfungsi, copy link ini: ${verificationLink}</p>
        </div>
      `,
    });
  } catch (emailError: any) {
    console.error("Email Error:", emailError);
  }

  (await cookies()).set("pending_verification_signup", "true", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

  return { success: true };
}

// --- 4. RESEND VERIFICATION EMAIL ---
export async function resendVerificationEmail(email: string) {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email,
    options: { emailRedirectTo: `${origin}/callback` },
  });

  if (error) return { error: error.message };
  return { success: true };
}

// --- 5. FORGOT PASSWORD ---
export async function forgotPassword(
  values: z.infer<typeof forgotPasswordSchema>
) {
  const supabaseAdmin = createAdminClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Generate Link Reset
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "recovery",
    email: values.email,
    options: {
      redirectTo: `${origin}/update-password`,
    },
  });

  if (error) return { error: error.message };

  const resetLink = data.properties.action_link;

  try {
    await resend.emails.send({
      // FIXED: Menggunakan sender domain yang sudah diverifikasi
      from: "UPJ CART <hi@the-candils.com>",
      to: values.email,
      subject: "Reset Password UPJ Cart",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h1>Permintaan Reset Password</h1>
          <p>Seseorang (semoga Anda) meminta reset password untuk akun UPJ Cart.</p>
          <p>Klik tombol di bawah ini untuk membuat password baru:</p>
          <div style="margin: 20px 0;">
             <a href="${resetLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Buat Password Baru
            </a>
          </div>
          <p style="font-size: 12px; color: #666;">Link ini akan kadaluarsa dalam waktu singkat.</p>
        </div>
      `,
    });
  } catch (emailError) {
    return { error: "Failed to send reset email." };
  }

  // Set Cookie akses sementara
  (await cookies()).set("pending_verification_reset", "true", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

  return { success: true };
}

// --- 6. UPDATE PASSWORD ---
export async function updatePassword(
  values: z.infer<typeof updatePasswordSchema>
) {
  const supabase = await createClient();

  // Update password untuk user yang sedang login
  const { error } = await supabase.auth.updateUser({
    password: values.password,
  });

  if (error) return { error: error.message };
  return { success: true };
}
