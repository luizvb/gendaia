import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  addDays,
  addMinutes,
  format,
  parse,
  setHours,
  setMinutes,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { getBusinessId } from "@/lib/business-id";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = "force-dynamic";

// Set timezone for Brazil
const TIMEZONE = "America/Sao_Paulo";

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

interface BusinessHours {
  day_of_week: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
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

    // Create Supabase client
    const supabase = await createClient();

    // Fetch business hours first
    const { data: businessHours, error: businessHoursError } = await supabase
      .from("business_hours")
      .select("*")
      .eq("business_id", businessId);

    if (businessHoursError) {
      console.error("Error fetching business hours:", businessHoursError);
      return NextResponse.json(
        { error: "Failed to fetch business hours" },
        { status: 500 }
      );
    }

    // Default business hours if none are set
    const defaultBusinessHours: BusinessHours[] = Array.from({ length: 7 }).map(
      (_, i) => ({
        day_of_week: i,
        is_open: i !== 0 && i !== 6, // Closed on weekends by default
        open_time: "09:00",
        close_time: "19:00",
        business_id: businessId,
      })
    );

    // Use default hours if none are set
    const hours =
      businessHours && businessHours.length > 0
        ? businessHours
        : defaultBusinessHours;

    // If fetchAll is true, fetch availability for all professionals
    if (fetchAll) {
      // Fetch all professionals
      const { data: professionals, error: professionalsError } = await supabase
        .from("professionals")
        .select("id, name, color, business_id")
        .eq("business_id", businessId);

      if (professionalsError) {
        console.error("Error fetching professionals:", professionalsError);
        return NextResponse.json(
          { error: "Error fetching professionals" },
          { status: 500 }
        );
      }

      // Initial and final date for calculation
      let startDateTime, endDateTime;

      // Use provided date range if available, otherwise use days ahead
      if (startDate && endDate) {
        // Parse dates as local dates in the specified timezone
        startDateTime = toZonedTime(
          parse(startDate, "yyyy-MM-dd", new Date()),
          TIMEZONE
        );
        endDateTime = toZonedTime(
          parse(endDate, "yyyy-MM-dd", new Date()),
          TIMEZONE
        );
      } else {
        // Use days ahead from today in the specified timezone
        const today = toZonedTime(new Date(), TIMEZONE);
        startDateTime = toZonedTime(today, TIMEZONE);
        endDateTime = toZonedTime(addDays(today, daysAhead - 1), TIMEZONE);
      }

      // Generate dates for the specified interval
      const dates: string[] = [];
      let currentDate = startDateTime;
      while (currentDate <= endDateTime) {
        // Convert to local date in the specified timezone for formatting
        const zonedDate = toZonedTime(currentDate, TIMEZONE);
        dates.push(format(zonedDate, "yyyy-MM-dd"));
        currentDate = addDays(currentDate, 1);
      }

      // Fetch all appointments for the interval
      const formattedStartDate = format(
        toZonedTime(startDateTime, TIMEZONE),
        "yyyy-MM-dd"
      );
      const formattedEndDate = format(
        toZonedTime(addDays(endDateTime, 1), TIMEZONE),
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
        console.error("Error fetching appointments:", appointmentsError);
        return NextResponse.json(
          { error: "Error fetching availability" },
          { status: 500 }
        );
      }

      // Calculate availability for each professional and each day
      const professionalAvailability: ProfessionalAvailability[] =
        professionals.map((professional) => {
          const availability: { [date: string]: string[] } = {};

          // For each date, calculate available slots
          dates.forEach((dateStr) => {
            // Filter this professional's appointments for this date
            const professionalAppointments = allAppointments.filter(
              (app: Appointment) =>
                app.professional_id === professional.id &&
                app.start_time.startsWith(dateStr)
            );

            // Calculate available slots for this date
            const availableSlots = calculateAvailableSlots(
              dateStr,
              professionalAppointments,
              serviceDuration,
              hours
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
    // Otherwise, maintain original behavior for a specific professional
    else if (professionalId && date) {
      // Fetch existing appointments for the professional on that day
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
        console.error("Error fetching appointments:", error);
        return NextResponse.json(
          { error: "Error fetching availability" },
          { status: 500 }
        );
      }

      const availableSlots = calculateAvailableSlots(
        date,
        appointments,
        serviceDuration,
        hours
      );
      return NextResponse.json({ available_slots: availableSlots });
    } else {
      return NextResponse.json(
        {
          error:
            "Invalid parameters. Use professional_id and date, or fetch_all=true",
        },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error processing availability:", error);
    return NextResponse.json(
      { error: "Error processing availability" },
      { status: 500 }
    );
  }
}

// Helper function to calculate available slots
function calculateAvailableSlots(
  dateStr: string,
  appointments: Appointment[],
  serviceDuration: number,
  businessHours: BusinessHours[]
): string[] {
  // Convert date string to Date object in the specific timezone
  const parsedDate = parse(dateStr, "yyyy-MM-dd", new Date());
  const currentDate = toZonedTime(parsedDate, TIMEZONE);

  // Get the day of week (0 = Sunday, 1 = Monday, etc.)
  // Use local timezone for day of week calculation
  const zonedDate = toZonedTime(currentDate, TIMEZONE);
  const dayOfWeek = zonedDate.getDay();

  // Get business hours for this day
  const dayHours = businessHours.find((h) => h.day_of_week === dayOfWeek);

  // If business is closed on this day or hours not found, return empty array
  if (!dayHours || !dayHours.is_open) {
    return [];
  }

  // Parse business hours
  const [openHour, openMinute] = dayHours.open_time.split(":").map(Number);
  const [closeHour, closeMinute] = dayHours.close_time.split(":").map(Number);

  // Set start and end of workday in local timezone
  const dayStart = toZonedTime(
    setMinutes(setHours(zonedDate, openHour), openMinute),
    TIMEZONE
  );
  const dayEnd = toZonedTime(
    setMinutes(setHours(zonedDate, closeHour), closeMinute),
    TIMEZONE
  );

  // Initialize array of available slots
  const availableSlots: string[] = [];
  let currentSlot = dayStart;

  // Function to check if a time conflicts with existing appointments
  const hasConflict = (start: Date, end: Date) => {
    return (appointments || []).some((appointment: Appointment) => {
      const appointmentStart = new Date(appointment.start_time);
      const appointmentEnd = new Date(appointment.end_time);

      // Check for overlap between intervals
      return (
        (start < appointmentEnd && end > appointmentStart) ||
        // Also check specific cases of exact start/end
        start.getTime() === appointmentStart.getTime() ||
        end.getTime() === appointmentEnd.getTime() ||
        // Check if slot is completely within an appointment
        (start >= appointmentStart && end <= appointmentEnd) ||
        // Check if appointment is completely within slot
        (appointmentStart >= start && appointmentEnd <= end)
      );
    });
  };

  // Function to check if a slot is in the past - using server-local now with timezone
  const isPast = (date: Date) => {
    const now = toZonedTime(new Date(), TIMEZONE);
    return date < now;
  };

  // Generate available slots every 15 minutes
  while (currentSlot < dayEnd) {
    // For each 15-minute slot, we check if a service with the given duration would fit
    const serviceEnd = addMinutes(currentSlot, serviceDuration);

    // Check if the entire service fits within business hours
    // and if there's no conflict with other appointments
    // and if the slot is not in the past
    if (
      serviceEnd <= dayEnd &&
      !hasConflict(currentSlot, serviceEnd) &&
      !isPast(currentSlot)
    ) {
      // Convert the slot time to the local timezone for display
      const localSlotTime = toZonedTime(currentSlot, TIMEZONE);
      availableSlots.push(format(localSlotTime, "HH:mm"));
    }

    // Move to next 15-minute slot
    currentSlot = addMinutes(currentSlot, 15);
  }

  return availableSlots;
}
