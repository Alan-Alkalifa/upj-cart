"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin"; 
import { loginSchema, registerSchema, merchantRegisterSchema } from "@/lib/auth-schemas";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// --- 1. LOGIN (UPDATED) ---
export async function login(values: z.infer<typeof loginSchema>) {
  const supabase = await createClient();
  
  // 1. Attempt Sign In
  const { data, error } = await supabase.auth.signInWithPassword({
    email: values.email,
    password: values.password,
  });

  if (error) return { error: error.message };

  // 2. Check User Role (Profile) & Org Membership
  // We fetch both checks in parallel for performance
  const [profileRes, memberRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single(),
    
    supabase
      .from("organization_members")
      .select("id")
      .eq("profile_id", data.user.id)
      .maybeSingle()
  ]);

  const role = profileRes.data?.role;
  const isMerchant = !!memberRes.data;

  // 3. Conditional Redirect Logic
  if (role === "super_admin") {
    redirect("/admin");
  } else if (isMerchant) {
    redirect("/dashboard");
  } else {
    redirect("/");
  }
}

// --- 2. BUYER SIGNUP ---
export async function signup(values: z.infer<typeof registerSchema>) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.fullName }, // Role defaults to 'buyer' via DB Trigger
    },
  });

  if (error) return { error: error.message };
  return { success: true };
}

// --- 3. MERCHANT ATOMIC REGISTRATION ---
export async function registerMerchant(values: z.infer<typeof merchantRegisterSchema>) {
  const supabase = await createClient();
  const supabaseAdmin = createAdminClient(); 

  // Guard: Must be logged out
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return { error: "Anda sedang login. Logout terlebih dahulu." };

  // 1. Check Slug Availability
  const { data: existingSlug } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", values.storeSlug)
    .single();

  if (existingSlug) return { error: "URL Toko sudah digunakan." };

  // 2. Create Auth User (Silent - Tanpa Email Otomatis Supabase)
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: values.email,
    password: values.password,
    email_confirm: false, // User dibuat dalam status unverified
    user_metadata: { full_name: values.fullName }
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Gagal membuat user." };

  // 3. RPC Transaction 
  const { error: rpcError } = await supabaseAdmin.rpc('register_merchant_transaction', {
    p_user_id: authData.user.id,
    p_email: values.email,
    p_full_name: values.fullName,
    p_store_name: values.storeName,
    p_store_slug: values.storeSlug,
    p_store_desc: values.description || ""
  });

  if (rpcError) {
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    console.error("RPC Error:", rpcError);
    return { error: "Gagal membuat toko. Database error." };
  }

  // --- EMAIL LOGIC ---

  try {
    // A. Generate Link Verifikasi Email
    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "signup",
      email: values.email,
      password: values.password,
      options: {
        redirectTo: "http://localhost:3000/dashboard" 
      }
    });

    if (linkError) throw linkError;

    const verificationLink = linkData.properties.action_link;

    // B. Kirim Email Verifikasi ke Merchant (Via Resend)
    await resend.emails.send({
      from: 'UPJ Cart <onboarding@resend.dev>',
      to: values.email, 
      subject: 'Verifikasi Email Toko Anda',
      html: `
        <h1>Selamat Datang di UPJ Cart!</h1>
        <p>Halo ${values.fullName}, toko <b>${values.storeName}</b> berhasil dibuat.</p>
        <p>Silakan klik link di bawah ini untuk memverifikasi email Anda dan mulai berjualan:</p>
        <a href="${verificationLink}" style="padding: 10px 20px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 5px;">Verifikasi Email</a>
        <p>Atau copy link ini: ${verificationLink}</p>
      `
    });

    // C. Kirim Notifikasi ke Admin
    const adminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (adminEmail) {
      await resend.emails.send({
        from: 'UPJ Cart System <onboarding@resend.dev>',
        to: adminEmail,
        subject: `[ALERT] Toko Baru: ${values.storeName}`,
        html: `
          <p>Merchant baru terdaftar:</p>
          <ul>
            <li>Nama: ${values.fullName}</li>
            <li>Toko: ${values.storeName} (${values.storeSlug})</li>
            <li>Email: ${values.email}</li>
          </ul>
        `
      });
    }

  } catch (emailError: any) {}

  return { success: true };
}