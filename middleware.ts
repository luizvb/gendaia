import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(request: NextRequest) {
  // Check for subdomain
  const hostname = request.headers.get("host") || "";
  const isSubdomain = hostname.includes(".") && !hostname.startsWith("www.");

  const isRootPath = request.nextUrl.pathname === "/";

  if (isSubdomain && isRootPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/booking";
    return NextResponse.redirect(url);
  }

  // Permitir acesso às rotas de teste sem autenticação
  if (request.nextUrl.pathname.startsWith("/api")) {
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
  const publicRoutes = ["/login", "/register", "/auth", "/booking"];
  const isPublicRoute = publicRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  );

  const isRootRoute = request.nextUrl.pathname === "/";

  // Allow access to onboarding only for authenticated users
  const isOnboardingRoute = request.nextUrl.pathname.startsWith("/onboarding");

  if (!user) {
    if (!isPublicRoute && !isRootRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } else {
    // Primeiro, verifica o business_id para qualquer rota autenticada
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("user_id", user.id)
        .single();

      // Se não tem business_id e não está na rota de onboarding ou na API de business
      const isBusinessApiRoute =
        request.nextUrl.pathname.startsWith("/api/business");
      if (!profile?.business_id && !isOnboardingRoute && !isBusinessApiRoute) {
        const url = request.nextUrl.clone();
        url.pathname = "/onboarding";
        return NextResponse.redirect(url);
      }

      // Se tem business_id e é uma requisição API (exceto API de business), adiciona o header
      if (
        profile?.business_id &&
        request.nextUrl.pathname.startsWith("/api") &&
        !isBusinessApiRoute
      ) {
        const requestWithBusinessId = new Request(request.url, {
          headers: new Headers(request.headers),
          method: request.method,
          body: request.body,
          redirect: request.redirect,
          signal: request.signal,
        });
        requestWithBusinessId.headers.set("x-business-id", profile.business_id);
        supabaseResponse = NextResponse.next({
          request: requestWithBusinessId,
        });
      }

      // Check subscription status if business_id exists
      if (profile?.business_id) {
        const { data: subscription } = await supabase
          .from("subscriptions")
          .select("*")
          .eq("business_id", profile.business_id)
          .single();

        // If no subscription or trial has ended without active subscription

        if (
          (subscription &&
            subscription.status === "trialing" &&
            new Date(subscription.trial_end_date) < new Date()) ||
          subscription.status === "canceled" ||
          subscription.status === "incomplete_expired"
        ) {
          // Allow access to settings page to set up subscription
          if (!request.nextUrl.pathname.startsWith("/dashboard/subscription")) {
            return NextResponse.redirect(
              new URL("/dashboard/subscription", request.url)
            );
          }
        }
      }
    } catch (error) {
      console.error("Error fetching business_id in middleware:", error);
    }

    // Redireciona usuários autenticados para fora das páginas públicas
    if (
      isPublicRoute &&
      !isOnboardingRoute &&
      !request.nextUrl.pathname.startsWith("/booking")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
