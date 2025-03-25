import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const code = requestUrl.searchParams.get("code");
    const origin = requestUrl.origin;
    const host = requestUrl.hostname;

    const localOrigin = requestUrl.searchParams.get("local_origin");
    const targetDomain = requestUrl.searchParams.get("target_domain");
    const source = requestUrl.searchParams.get("source");

    const isProdCallback =
      host.includes("gendaia.com.br") || host.includes("gendaia.vercel.app");

    if (!code) {
      return NextResponse.redirect(new URL("/login?error=no_code", origin));
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (err) {
              // Erro ao definir cookies - pode ser ignorado se o middleware estiver atualizando as sessões
            }
          },
        },
      }
    );

    // Tentando trocar o código por uma sessão
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(`/login?error=${error.message}`, origin)
      );
    }

    // Decide a URL base para redirecionamento com base nas condições:
    let baseUrl;

    // Priorizar o parâmetro de URL local_origin se ele existir (ambiente local)
    if (localOrigin && (source === "localhost" || targetDomain === "local")) {
      baseUrl = localOrigin;
    }
    // Se não tiver localOrigin mas estiver no ambiente de produção
    else if (isProdCallback) {
      baseUrl = "https://www.gendaia.com.br"; // Use seu domínio principal
    }
    // Caso contrário, use a origem da requisição
    else {
      baseUrl = origin;
    }

    // Redirecionando para o dashboard usando a URL base determinada
    const redirectUrl = new URL("/dashboard/calendar", baseUrl);

    return NextResponse.redirect(redirectUrl);
  } catch (err) {
    return NextResponse.redirect(
      new URL("/login?error=callback_error", new URL(request.url).origin)
    );
  }
}
