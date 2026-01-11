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
import { Resend } from "resend";

const isProduction = process.env.NODE_ENV === "production";
const origin = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const resend = new Resend(process.env.RESEND_API_KEY);

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

  const { data: existingProfile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", values.email)
    .maybeSingle();

  if (existingProfile) {
    return { error: "Email already used." };
  }

  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.fullName },
      emailRedirectTo: `${origin}/callback`,
    },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      return { error: "Email already used." };
    }
    return { error: error.message };
  }

  (await cookies()).set("pending_verification_signup", "true", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

  return { success: true };
}

// --- 3. MERCHANT REGISTRATION (Custom Email Flow) ---
export async function registerMerchant(
  values: z.infer<typeof merchantRegisterSchema>
) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient();
  const validatedFields = merchantRegisterSchema.safeParse(values);

  if (!validatedFields.success) {
    return {
      error: "Data tidak valid. Pastikan email menggunakan domain @upj.ac.id.",
    };
  }

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

  if (existingUser) return { error: "Email sudah terdaftar." };

  const { data: existingSlug } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", data.storeSlug)
    .single();

  if (existingSlug) return { error: "URL Toko (Slug) sudah digunakan." };

  // 3. GENERATE LINK + CREATE USER (Instead of standard signUp)
  // This prevents Supabase from sending its default email and gives us the link
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.generateLink({
    type: "signup",
    email: data.email,
    password: data.password,
    options: {
      data: { full_name: data.fullName },
      redirectTo: `${origin}/merchant-dashboard`,
    },
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Gagal membuat user." };

  const verificationLink = authData.properties?.action_link;

  // 4. RPC Transaction (Create Profile & Store)
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

  // --- 5. SEND MERCHANT VERIFICATION EMAIL (RESEND) ---
  if (verificationLink) {
    try {
      await resend.emails.send({
        // Use your verified domain or the Resend testing domain
        from: "Bemlanja Verification <support@bemlanja.com>",
        to: data.email,
        subject: "Verifikasi Email Toko - Bemlanja",
        html: `
          <div style="font-family: sans-serif; padding: 20px;">
            <h1>Selamat Datang di Bemlanja!</h1>
            <p>Halo <b>${data.fullName}</b>,</p>
            <p>Terima kasih telah mendaftarkan toko <b>${data.storeName}</b>.</p>
            <p>Silakan klik tombol di bawah untuk memverifikasi email Anda dan mengaktifkan akun:</p>
            <br />
            <a href="${verificationLink}" style="background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verifikasi Email</a>
            <br /><br />
            <p style="color: #666; font-size: 14px;">Atau copy link ini: <br/>${verificationLink}</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
    }
  }

  // --- 6. SEND ADMIN NOTIFICATION EMAIL ---
  try {
    await resend.emails.send({
      from: "Bemlanja Notifications <support@bemlanja.com>",
      to: process.env.SUPER_ADMIN_EMAIL || "admin@upj.ac.id",
      subject: `New Merchant Registration: ${data.storeName}`,
      html: `
        <h1>New Merchant Registration</h1>
        <ul>
          <li><strong>Store:</strong> ${data.storeName}</li>
          <li><strong>Owner:</strong> ${data.fullName}</li>
          <li><strong>Email:</strong> ${data.email}</li>
        </ul>
      `,
    });
  } catch (err) {
    console.error("Failed to send admin notification:", err);
  }

  return { success: true };
}

// --- 4. RESEND VERIFICATION EMAIL (Manual Trigger) ---
export async function resendVerificationEmail(email: string) {
  const supabaseAdmin = createAdminClient();

  // Use 'magiclink' to generate a verification link without needing a password
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "magiclink",
    email: email,
    options: { redirectTo: `${origin}/callback` },
  });

  if (error) return { error: error.message };

  const verificationLink = data.properties?.action_link;

  if (verificationLink) {
    try {
      await resend.emails.send({
        from: "Bemlanja Verification <support@bemlanja.com>",
        to: email,
        subject: "Kirim Ulang Verifikasi Email",
        html: `
          <p>Klik tombol di bawah untuk memverifikasi email Anda:</p>
          <a href="${verificationLink}">Verifikasi Email</a>
        `,
      });
    } catch (e) {
      console.error(e);
      return { error: "Gagal mengirim email verifikasi." };
    }
  }

  return { success: true };
}

// --- 5. FORGOT PASSWORD ---
export async function forgotPassword(
  values: z.infer<typeof forgotPasswordSchema>
) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
    redirectTo: `${origin}/update-password`,
  });

  if (error) return { error: error.message };

  (await cookies()).set("pending_verification_reset", "true", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

  return { success: true };
}

export async function updatePassword(values: z.infer<typeof updatePasswordSchema>) {
  const supabase = await createClient();
  const validatedFields = updatePasswordSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: "Invalid fields" };
  }

  const { password } = validatedFields.data;

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) return { error: error.message };

  return { success: true };
}