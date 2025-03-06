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

    const { data, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Erro ao buscar assinaturas:", error);
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

    // Validar dados
    if (!body.plan) {
      return NextResponse.json(
        { error: "Dados incompletos. Forneça plan" },
        { status: 400 }
      );
    }

    // Verificar se já existe uma assinatura para este negócio
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (existingSubscription) {
      // Atualizar a assinatura existente
      const { data, error } = await supabase
        .from("subscriptions")
        .update({
          plan: body.plan,
          status: body.status || "active",
          start_date: body.start_date || new Date().toISOString(),
          end_date: body.end_date || null,
          trial_end_date: body.trial_end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingSubscription.id)
        .select();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(data[0]);
    }

    // Criar nova assinatura
    const { data, error } = await supabase
      .from("subscriptions")
      .insert([
        {
          plan: body.plan,
          status: body.status || "active",
          start_date: body.start_date || new Date().toISOString(),
          end_date: body.end_date || null,
          trial_end_date: body.trial_end_date || null,
          business_id: businessId,
        },
      ])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Erro ao criar assinatura:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
