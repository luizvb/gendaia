import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );

    // Retrieve the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verificar se o usuário já tem um perfil com um negócio associado
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error checking profile:", profileError);
      return NextResponse.json(
        { error: "Error checking profile: " + profileError.message },
        { status: 500 }
      );
    }

    let hasExistingBusiness = false;
    let businessData = null;

    // Se o usuário já tem um perfil com business_id, buscar o negócio
    if (profile?.business_id) {
      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("id, name")
        .eq("id", profile.business_id)
        .maybeSingle();

      if (businessError) {
        console.error("Error fetching business:", businessError);
        return NextResponse.json(
          { error: "Error fetching business: " + businessError.message },
          { status: 500 }
        );
      }

      if (business) {
        hasExistingBusiness = true;
        businessData = business;
      }
    }

    // Get email-linked businesses that the user is not already a part of
    const { data: linkedData, error: linkedError } = await supabase
      .from("professionals")
      .select(
        `
        id,
        name,
        email,
        business_id,
        businesses:business_id (
          id,
          name,
          description
        )
      `
      )
      .eq("email", user.email);

    if (linkedError) {
      console.error("Error fetching linked businesses:", linkedError);
      return NextResponse.json(
        { error: "Error fetching linked businesses: " + linkedError.message },
        { status: 500 }
      );
    }

    // Filtrar apenas profissionais que têm um negócio vinculado
    // e excluir o negócio do perfil do usuário (se ele já tiver um)
    const linkedBusinesses =
      linkedData?.filter(
        (item) => item.businesses && item.business_id !== profile?.business_id
      ) || [];

    return NextResponse.json({
      linkedBusinesses: linkedBusinesses,
      hasExistingBusiness,
      businessData,
    });
  } catch (error) {
    console.error("Business check error:", error);
    return NextResponse.json(
      { error: "Failed to check businesses" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
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
            } catch {
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    const body = await request.json();
    const { businessId } = body;

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Get the current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if the professional exists and belongs to the given business
    const { data: professional, error: professionalError } = await supabase
      .from("professionals")
      .select("id, email, business_id")
      .eq("email", user.email)
      .eq("business_id", businessId)
      .maybeSingle();

    if (professionalError) {
      console.error("Error finding professional:", professionalError);
      return NextResponse.json(
        { error: "Error finding professional: " + professionalError.message },
        { status: 500 }
      );
    }

    if (!professional) {
      return NextResponse.json(
        { error: "No matching professional found" },
        { status: 404 }
      );
    }

    // Verificar se o negócio existe
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .single();

    if (businessError) {
      console.error("Error finding business:", businessError);
      return NextResponse.json(
        { error: "Error finding business: " + businessError.message },
        { status: 500 }
      );
    }

    // Vincular o perfil do usuário ao negócio
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ business_id: businessId })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error linking profile to business:", updateError);
      return NextResponse.json(
        { error: "Failed to link profile to business: " + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Business join error:", error);
    return NextResponse.json(
      { error: "Failed to join business" },
      { status: 500 }
    );
  }
}
