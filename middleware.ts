import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

export async function middleware(request: NextRequest) {
  // Permitir acesso às rotas de teste sem autenticação
  if (
    request.nextUrl.pathname.startsWith("/api/test-") ||
    request.nextUrl.pathname.startsWith("/api/clear-cache") ||
    request.nextUrl.pathname.startsWith("/cache-test")
  ) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Allow access to auth-related and public routes
  const publicRoutes = ["/login", "/register", "/auth"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  // Allow access to onboarding only for authenticated users
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");

  if (!user) {
    if (!isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } else if (isPublicRoute && !isOnboardingRoute) {
    // Redirect authenticated users away from auth pages (except onboarding)
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  } else if (user && request.nextUrl.pathname.startsWith("/api")) {
    // For authenticated API requests, fetch the business_id from the profile
    // and attach it to the request
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      if (profile?.business_id) {
        // Clone the request to modify headers
        const requestWithBusinessId = new Request(request.url, {
          headers: new Headers(request.headers),
          method: request.method,
          body: request.body,
          redirect: request.redirect,
          signal: request.signal,
        });

        // Add business_id to a custom header
        requestWithBusinessId.headers.set("x-business-id", profile.business_id);

        // Create a new response with the modified request
        supabaseResponse = NextResponse.next({
          request: requestWithBusinessId,
        });
      }
    } catch (error) {
      console.error("Error fetching business_id in middleware:", error);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
