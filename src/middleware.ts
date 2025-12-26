import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
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
    "/merchant-register",
    "/forgot-password",
    "/update-password",
    "/verify-email-sign-up",
    "/verify-email-reset-password",
  ];
  const protectedRoutes = ["/dashboard", "/admin"];
  const adminRoutes = ["/admin"];

  const isAuthRoute = authRoutes.some((route) => path.startsWith(route));
  const isProtectedRoute = protectedRoutes.some((route) =>
    path.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) => path.startsWith(route));

  // 3. Logic: Jika User SUDAH Login
  if (user) {
    // Jika user mengakses halaman Auth, tendang ke dashboard/home
    if (isAuthRoute) {
      // Ambil role user untuk redirect yang tepat
      // (Kita gunakan try-catch agar error DB tidak memblokir akses)
      let targetUrl = "/";
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const { data: member } = await supabase
          .from("organization_members")
          .select("id")
          .eq("profile_id", user.id)
          .maybeSingle();

        if (profile?.role === "super_admin") targetUrl = "/admin";
        else if (member) targetUrl = "/dashboard";
      } catch (e) {
        // Fallback jika gagal fetch role
        console.error("Middleware Role Check Error:", e);
      }

      // PENTING: Gunakan URL object untuk redirect
      const redirectUrl = new URL(targetUrl, request.url);

      // Copy cookies dari response awal ke response redirect agar session tidak hilang
      const redirectResponse = NextResponse.redirect(redirectUrl);

      // Salin cookies (trik mengatasi bug refresh token hilang)
      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        redirectResponse.headers.set("set-cookie", setCookieHeader);
      }

      return redirectResponse;
    }

    // Proteksi Route Admin
    if (isAdminRoute) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "super_admin") {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
  }

  // 4. Logic: Jika User BELUM Login
  if (!user) {
    if (isProtectedRoute) {
      const redirectUrl = new URL("/login", request.url);
      // redirectUrl.searchParams.set("next", path); // Opsional
      return NextResponse.redirect(redirectUrl);
    }
  }

  // 5. Cek Cookie Khusus (Verify Email) - Tetap gunakan logic Anda sebelumnya
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
