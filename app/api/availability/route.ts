import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  addMinutes,
  format as formatDateFns,
  parse,
  setHours,
  setMinutes,
} from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { getBusinessId } from "@/lib/business-id";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = "force-dynamic";

// São Paulo timezone
const SP_TIMEZONE = "America/Sao_Paulo";

// Horário de funcionamento
const BUSINESS_HOURS = {
  start: { hour: 9, minute: 0 }, // 9:00
  end: { hour: 19, minute: 0 }, // 19:00
  interval: 15, // minutos
};

interface Appointment {
  start_time: string;
  end_time: string;
  professional_id?: string;
}

interface ProfessionalAvailability {
  id: string;
  availability: {
    [date: string]: string[]; // date in format YYYY-MM-DD, array of available time slots
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const professionalId = searchParams.get("professional_id");
    const date = searchParams.get("date");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const serviceDuration = parseInt(
      searchParams.get("service_duration") || "30"
    );

    const fetchAll = searchParams.get("fetch_all") === "true";
    const daysAhead = parseInt(searchParams.get("days_ahead") || "15");

    const businessId =
      (await getBusinessId(request)) || searchParams.get("business_id");
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }
    // Criar cliente Supabase e aguardar sua inicialização
    const supabase = await createClient();

    // Se fetchAll for true, buscar disponibilidade para todos os profissionais
    if (fetchAll) {
      // Buscar todos os profissionais
      const { data: professionals, error: professionalsError } = await supabase
        .from("professionals")
        .select("id, name, color, business_id")
        .eq("business_id", businessId);

      if (professionalsError) {
        console.error("Erro ao buscar profissionais:", professionalsError);
        return NextResponse.json(
          { error: "Erro ao buscar profissionais" },
          { status: 500 }
        );
      }

      // Data inicial e final para o cálculo
      let startDateTime, endDateTime;

      // Use provided date range if available, otherwise use days ahead
      if (startDate && endDate) {
        startDateTime = parse(startDate, "yyyy-MM-dd", new Date());
        // Adjust to SP timezone
        startDateTime = toZonedTime(startDateTime, SP_TIMEZONE);

        endDateTime = parse(endDate, "yyyy-MM-dd", new Date());
        // Adjust to SP timezone
        endDateTime = toZonedTime(endDateTime, SP_TIMEZONE);
      } else {
        // Use days ahead from today - make sure this is in SP timezone
        const today = toZonedTime(new Date(), SP_TIMEZONE);
        startDateTime = today;
        endDateTime = addDays(today, daysAhead - 1);
      }

      // Datas para o intervalo especificado
      const dates: string[] = [];
      let currentDate = startDateTime;
      while (currentDate <= endDateTime) {
        dates.push(formatInTimeZone(currentDate, SP_TIMEZONE, "yyyy-MM-dd"));
        currentDate = addDays(currentDate, 1);
      }

      // Buscar todos os agendamentos para o intervalo
      const formattedStartDate = formatInTimeZone(
        startDateTime,
        SP_TIMEZONE,
        "yyyy-MM-dd"
      );
      const formattedEndDate = formatInTimeZone(
        addDays(endDateTime, 1),
        SP_TIMEZONE,
        "yyyy-MM-dd"
      );

      let appointmentsQuery = supabase
        .from("appointments")
        .select("start_time, end_time, professional_id")
        .gte("start_time", `${formattedStartDate}T00:00:00`)
        .lt("start_time", `${formattedEndDate}T00:00:00`);

      // Add business_id filter if provided
      if (businessId) {
        appointmentsQuery = appointmentsQuery.eq("business_id", businessId);
      }

      const { data: allAppointments, error: appointmentsError } =
        await appointmentsQuery;

      if (appointmentsError) {
        console.error("Erro ao buscar agendamentos:", appointmentsError);
        return NextResponse.json(
          { error: "Erro ao buscar disponibilidade" },
          { status: 500 }
        );
      }

      // Calcular disponibilidade para cada profissional e cada dia
      const professionalAvailability: ProfessionalAvailability[] =
        professionals.map((professional) => {
          const availability: { [date: string]: string[] } = {};

          // Para cada data, calcular slots disponíveis
          dates.forEach((dateStr) => {
            // Filtrar agendamentos deste profissional para esta data
            const professionalAppointments = allAppointments.filter(
              (app: Appointment) =>
                app.professional_id === professional.id &&
                app.start_time.startsWith(dateStr)
            );

            // Calcular slots disponíveis para esta data
            const availableSlots = calculateAvailableSlots(
              dateStr,
              professionalAppointments,
              serviceDuration
            );

            availability[dateStr] = availableSlots;
          });

          return {
            id: professional.id,
            availability,
          };
        });

      return NextResponse.json({
        professionals_availability: professionalAvailability,
      });
    }
    // Caso contrário, manter o comportamento original para um profissional específico
    else if (professionalId && date) {
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

      const availableSlots = calculateAvailableSlots(
        date,
        appointments,
        serviceDuration
      );
      return NextResponse.json({ available_slots: availableSlots });
    } else {
      return NextResponse.json(
        {
          error:
            "Parâmetros inválidos. Use professional_id e date, ou fetch_all=true",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Erro ao processar disponibilidade:", error);
    return NextResponse.json(
      { error: "Erro ao processar disponibilidade" },
      { status: 500 }
    );
  }
}

// Função auxiliar para calcular slots disponíveis
function calculateAvailableSlots(
  dateStr: string,
  appointments: Appointment[],
  serviceDuration: number
): string[] {
  // Parse the date string
  const currentDate = parse(dateStr, "yyyy-MM-dd", new Date());

  // Create specific time strings for start and end of business hours
  const startHour = BUSINESS_HOURS.start.hour.toString().padStart(2, "0");
  const startMinute = BUSINESS_HOURS.start.minute.toString().padStart(2, "0");
  const endHour = BUSINESS_HOURS.end.hour.toString().padStart(2, "0");
  const endMinute = BUSINESS_HOURS.end.minute.toString().padStart(2, "0");

  // Create date strings with time in ISO format
  const startDateStr = `${dateStr}T${startHour}:${startMinute}:00`;
  const endDateStr = `${dateStr}T${endHour}:${endMinute}:00`;

  // Parse these dates and convert to São Paulo timezone
  const dayStart = toZonedTime(new Date(startDateStr), SP_TIMEZONE);
  const dayEnd = toZonedTime(new Date(endDateStr), SP_TIMEZONE);

  // Inicializar array de slots disponíveis
  const availableSlots: string[] = [];
  let currentSlot = dayStart;

  // Função para verificar se um horário tem conflito com agendamentos existentes
  const hasConflict = (start: Date, end: Date) => {
    return (appointments || []).some((appointment: Appointment) => {
      // Converter os horários de agendamento para o timezone de SP
      const appointmentStartUTC = new Date(appointment.start_time);
      const appointmentEndUTC = new Date(appointment.end_time);

      const appointmentStart = toZonedTime(appointmentStartUTC, SP_TIMEZONE);
      const appointmentEnd = toZonedTime(appointmentEndUTC, SP_TIMEZONE);

      // Verificar se há sobreposição entre os intervalos
      // Um intervalo sobrepõe outro se:
      // - O início do novo é anterior ao fim do existente E
      // - O fim do novo é posterior ao início do existente
      return (
        (start < appointmentEnd && end > appointmentStart) ||
        // Também verificar casos específicos de início/fim exatamente iguais
        start.getTime() === appointmentStart.getTime() ||
        end.getTime() === appointmentEnd.getTime() ||
        // Verificar se o slot está completamente dentro de um agendamento
        (start >= appointmentStart && end <= appointmentEnd) ||
        // Verificar se o agendamento está completamente dentro do slot
        (appointmentStart >= start && appointmentEnd <= end)
      );
    });
  };

  // Gerar slots disponíveis a cada 15 minutos
  while (currentSlot < dayEnd) {
    // Para cada slot de 15 minutos, verificamos se um serviço com a duração mínima (15 min) caberia
    const slotEnd = addMinutes(currentSlot, 15);

    // Verificar se o slot inteiro cabe no horário de funcionamento
    // e se não há conflito com outros agendamentos
    if (slotEnd <= dayEnd && !hasConflict(currentSlot, slotEnd)) {
      // Format the time consistently in São Paulo timezone
      availableSlots.push(formatInTimeZone(currentSlot, SP_TIMEZONE, "HH:mm"));
    }

    // Avançar para o próximo slot de 15 minutos
    currentSlot = addMinutes(currentSlot, BUSINESS_HOURS.interval);
  }

  return availableSlots;
}
