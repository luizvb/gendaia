import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Buscar informações do negócio
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError) {
      return NextResponse.json(
        { error: businessError.message },
        { status: 500 }
      );
    }

    // If subdomain is not set, generate one from the business name
    if (!business.subdomain && business.name) {
      const subdomain = `${business.name
        .toLowerCase()
        .replace(/\s+/g, "-")}.gendaia.com.br`;

      // Update the business record with the generated subdomain
      await supabase
        .from("businesses")
        .update({ subdomain })
        .eq("id", businessId);

      business.subdomain = subdomain;
    }

    // Buscar horários de funcionamento
    const { data: businessHours, error: hoursError } = await supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", businessId)
      .order("day_of_week");

    if (hoursError) {
      return NextResponse.json({ error: hoursError.message }, { status: 500 });
    }

    return NextResponse.json({
      business,
      businessHours: businessHours || [],
    });
  } catch (error) {
    console.error("Erro ao buscar configurações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    // Atualizar informações do negócio
    if (body.business) {
      const { error: businessError } = await supabase
        .from("businesses")
        .update({
          name: body.business.name,
          address: body.business.address,
          phone: body.business.phone,
          email: body.business.email,
          description: body.business.description,
          logo: body.business.logo,
          updated_at: new Date().toISOString(),
        })
        .eq("id", businessId);

      if (businessError) {
        return NextResponse.json(
          { error: businessError.message },
          { status: 500 }
        );
      }
    }

    // Atualizar horários de funcionamento
    if (body.businessHours && Array.isArray(body.businessHours)) {
      // Primeiro, excluir os horários existentes
      const { error: deleteError } = await supabase
        .from("business_hours")
        .delete()
        .eq("business_id", businessId);

      if (deleteError) {
        return NextResponse.json(
          { error: deleteError.message },
          { status: 500 }
        );
      }

      // Inserir os novos horários
      const hoursToInsert = body.businessHours.map((hour: any) => ({
        day_of_week: hour.day_of_week,
        open_time: hour.open_time,
        close_time: hour.close_time,
        is_open: hour.is_open,
        business_id: businessId,
      }));

      const { error: insertError } = await supabase
        .from("business_hours")
        .insert(hoursToInsert);

      if (insertError) {
        return NextResponse.json(
          { error: insertError.message },
          { status: 500 }
        );
      }
    }

    // Buscar as configurações atualizadas
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    const { data: businessHours } = await supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", businessId)
      .order("day_of_week");

    return NextResponse.json(
      {
        business,
        businessHours: businessHours || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Erro ao atualizar configurações:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
