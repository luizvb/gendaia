import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const headerBusinessId = request.headers.get("X-Business-ID");

    let businessId;

    if (headerBusinessId) {
      businessId = headerBusinessId;
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      businessId = session.user.id;
    }

    const id = params.id;

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        professionals:professional_id (id, name),
        services:service_id (id, name, duration, price),
        clients:client_id (id, name, phone)
      `
      )
      .eq("id", id)
      .eq("business_id", businessId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Agendamento não encontrado" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro ao buscar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const headerBusinessId = request.headers.get("X-Business-ID");

    let businessId;

    if (headerBusinessId) {
      businessId = headerBusinessId;
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      businessId = session.user.id;
    }

    const id = params.id;
    const body = await request.json();

    const { data, error } = await supabase
      .from("appointments")
      .update({
        start_time: body.start_time,
        end_time: body.end_time,
        status: body.status,
        notes: body.notes,
        professional_id: body.professional_id,
        service_id: body.service_id,
        client_id: body.client_id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("business_id", businessId)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (data.length === 0) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (error: any) {
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const headerBusinessId = request.headers.get("X-Business-ID");

    let businessId;

    if (headerBusinessId) {
      businessId = headerBusinessId;
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      businessId = session.user.id;
    }

    const id = params.id;

    // First, get the appointment to check its date
    const { data: appointment, error: fetchError } = await supabase
      .from("appointments")
      .select("start_time")
      .eq("id", id)
      .eq("business_id", businessId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!appointment) {
      return NextResponse.json(
        { error: "Agendamento não encontrado" },
        { status: 404 }
      );
    }

    // Check if the appointment is in the past
    const appointmentStart = new Date(appointment.start_time);
    const now = new Date();

    if (appointmentStart < now) {
      return NextResponse.json(
        { error: "Não é possível cancelar agendamentos passados" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Erro ao excluir agendamento:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
