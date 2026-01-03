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
    redirectUrl = "/admin";
  } else if (isMerchant) {
    redirectUrl = "/merchant";
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
  const supabase = await createClient();      // Public Client (for SignUp)
  const supabaseAdmin = createAdminClient();  // Admin Client (for Checks & Rollback)

  // 1. Guard: User must be logged out
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return { error: "You are already logged in. Please log out first." };

  // 2. Check Existing User (Using Admin to peek at DB)
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

  // 3. Check Slug Availability
  const { data: existingSlug } = await supabaseAdmin
    .from("organizations")
    .select("id")
    .eq("slug", values.storeSlug)
    .single();

  if (existingSlug) return { error: "Merchant URL already used." };

  // 4. Create User using Public SIGNUP 
  // (This forces Supabase to send the email immediately)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { full_name: values.fullName }, // Meta data
      emailRedirectTo: `${origin}/merchant`, // Where to go after clicking email
    },
  });

  if (authError) return { error: authError.message };
  if (!authData.user) return { error: "Failed to create user." };

  // 5. RPC Transaction (Create Profile & Organization)
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

  // 6. ROLLBACK: If DB Transaction fails, delete the Auth User
  // If we don't do this, the user exists in Auth but has no Merchant Data.
  if (rpcError) {
    console.error("RPC Error:", rpcError);
    // Delete the user we just created so they can try again
    await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
    return { error: "Failed to create store data. Please try again." };
  }

  // 7. Success
  // The email was sent automatically by step #4.
  (await cookies()).set("pending_verification_signup", "true", {
    path: "/",
    httpOnly: true,
    secure: isProduction,
    maxAge: 300,
  });

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