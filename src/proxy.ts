import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // 1. Cek User
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  // 2. Definisi Route
  const authRoutes = [
    "/login",
    "/register",
    "/forgot-password",
    "/update-password",
    "/verify-email-sign-up",
    "/verify-email-reset-password",
  ];
  const protectedRoutes = ["/merchant-dashboard", "/admin-dashboard"];
  const adminRoutes = ["/admin-dashboard"];

  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));
  const isProtectedRoute = protectedRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  const isAdminRoute = adminRoutes.some(
    (route) => path === route || path.startsWith(`${route}/`)
  );

  // 3. Logic: Jika User SUDAH Login
  if (user) {
    // Jika user mengakses halaman Auth, tendang ke dashboard/home
    if (isAuthRoute) {
      let targetUrl = "/";
      try {
        // --- OPTIMASI 1: Cek Metadata Dulu ---
        // Jika role sudah ada di metadata user (cookie), gunakan itu.
        // Jika tidak, baru fetch ke database.
        let role = user.user_metadata?.role;
        let isMerchant = false; // Default false, cek DB jika perlu

        // Jika role belum ada di metadata, fetch dari DB
        if (!role) {
          const [profileRes, memberRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("role")
              .eq("id", user.id)
              .single(),
            supabase
              .from("organization_members")
              .select("id")
              .eq("profile_id", user.id)
              .maybeSingle(),
          ]);
          role = profileRes.data?.role;
          isMerchant = !!memberRes.data;
        } else {
          // Jika role ada di metadata, kita mungkin masih perlu cek merchant status
          // (Kecuali Anda juga menyimpan status merchant di metadata)
          if (role !== "super_admin") {
            const { data: member } = await supabase
              .from("organization_members")
              .select("id")
              .eq("profile_id", user.id)
              .maybeSingle();
            isMerchant = !!member;
          }
        }
        // -------------------------------------

        if (role === "super_admin") targetUrl = "/admin-dashboard";
        else if (isMerchant) targetUrl = "/merchant-dashboard";
      } catch (e) {
        console.error("Proxy Role Check Error:", e);
      }

      const redirectUrl = new URL(targetUrl, request.url);
      const redirectResponse = NextResponse.redirect(redirectUrl);

      // Salin cookies agar session tidak hilang saat redirect
      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        redirectResponse.headers.set("set-cookie", setCookieHeader);
      }

      return redirectResponse;
    }

    // Proteksi Route Admin
    if (isAdminRoute) {
      // Optimasi: Cek metadata dulu
      let role = user.user_metadata?.role;
      
      if (!role) {
         const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
        role = profile?.role;
      }

      if (role !== "super_admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // 4. Logic: Jika User BELUM Login
  if (!user) {
    if (isProtectedRoute) {
      const redirectUrl = new URL("/login", request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 5. Cek Cookie Khusus (Verify Email)
  if (
    path === "/verify-email-sign-up" &&
    !request.cookies.has("pending_verification_signup")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (
    path === "/verify-email-reset-password" &&
    !request.cookies.has("pending_verification_reset")
  ) {
    return NextResponse.redirect(new URL("/forgot-password", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|auth/callback|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};