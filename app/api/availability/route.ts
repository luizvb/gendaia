import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addMinutes, format, parse, setHours, setMinutes } from "date-fns";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = "force-dynamic";

// Horário de funcionamento
const BUSINESS_HOURS = {
  start: { hour: 9, minute: 0 }, // 9:00
  end: { hour: 19, minute: 0 }, // 19:00
  interval: 30, // minutos
};

interface Appointment {
  start_time: string;
  end_time: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const professionalId = searchParams.get("professional_id");
    const date = searchParams.get("date");
    const serviceDuration = parseInt(
      searchParams.get("service_duration") || "30"
    );
    const businessId = searchParams.get("business_id");

    if (!professionalId || !date) {
      return NextResponse.json(
        { error: "professional_id e date são obrigatórios" },
        { status: 400 }
      );
    }

    // Criar cliente Supabase e aguardar sua inicialização
    const supabase = await createClient();

    // Buscar agendamentos existentes para o profissional no dia
    let query = supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("professional_id", professionalId)
      .gte("start_time", `${date}T00:00:00`)
      .lt("start_time", `${date}T23:59:59`);

    // Add business_id filter if provided
    if (businessId) {
      query = query.eq("business_id", businessId);
    }

    const { data: appointments, error } = await query.order("start_time");

    if (error) {
      console.error("Erro ao buscar agendamentos:", error);
      return NextResponse.json(
        { error: "Erro ao buscar disponibilidade" },
        { status: 500 }
      );
    }

    // Converter a data de string para objeto Date
    const currentDate = parse(date, "yyyy-MM-dd", new Date());

    // Definir início e fim do dia de trabalho
    const dayStart = setMinutes(
      setHours(currentDate, BUSINESS_HOURS.start.hour),
      BUSINESS_HOURS.start.minute
    );
    const dayEnd = setMinutes(
      setHours(currentDate, BUSINESS_HOURS.end.hour),
      BUSINESS_HOURS.end.minute
    );

    // Inicializar array de slots disponíveis
    const availableSlots: string[] = [];
    let currentSlot = dayStart;

    // Função para verificar se um horário tem conflito com agendamentos existentes
    const hasConflict = (start: Date, end: Date) => {
      return (appointments || []).some((appointment: Appointment) => {
        const appointmentStart = new Date(appointment.start_time);
        const appointmentEnd = new Date(appointment.end_time);
        return start < appointmentEnd && end > appointmentStart;
      });
    };

    // Gerar slots disponíveis
    while (currentSlot < dayEnd) {
      const slotEnd = addMinutes(currentSlot, serviceDuration);

      // Verificar se o slot inteiro cabe no horário de funcionamento
      // e se não há conflito com outros agendamentos
      if (slotEnd <= dayEnd && !hasConflict(currentSlot, slotEnd)) {
        availableSlots.push(format(currentSlot, "HH:mm"));
      }

      // Avançar para o próximo slot
      currentSlot = addMinutes(currentSlot, BUSINESS_HOURS.interval);
    }

    return NextResponse.json({ available_slots: availableSlots });
  } catch (error) {
    console.error("Erro ao processar disponibilidade:", error);
    return NextResponse.json(
      { error: "Erro ao processar disponibilidade" },
      { status: 500 }
    );
  }
}
