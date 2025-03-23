import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { getBusinessId } from "@/lib/business-id";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = "force-dynamic";

// Use timezone from utility
const TIMEZONE = DEFAULT_TIMEZONE;

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

      // Initial and final date for calculation in UTC
      let startDateTime, endDateTime;

      // Use provided date range if available, otherwise use days ahead
      if (startDate && endDate) {
        // Parse dates in UTC - no timezone conversion needed for date-only values
        startDateTime = new Date(`${startDate}T00:00:00Z`);
        endDateTime = new Date(`${endDate}T00:00:00Z`);
      } else {
        // Use days ahead from today in UTC
        const today = new Date();
        startDateTime = new Date(
          Date.UTC(
            today.getUTCFullYear(),
            today.getUTCMonth(),
            today.getUTCDate()
          )
        );
        endDateTime = new Date(startDateTime);
        endDateTime.setUTCDate(endDateTime.getUTCDate() + daysAhead - 1);
      }

      // Generate dates for the specified interval using UTC
      const dates: string[] = [];
      let currentDate = new Date(startDateTime);
      while (currentDate <= endDateTime) {
        // Format dates in YYYY-MM-DD format using UTC
        dates.push(
          `${currentDate.getUTCFullYear()}-${String(
            currentDate.getUTCMonth() + 1
          ).padStart(2, "0")}-${String(currentDate.getUTCDate()).padStart(
            2,
            "0"
          )}`
        );
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }

      // Fetch all appointments for the interval using UTC date boundaries
      const formattedStartDate = `${startDateTime.getUTCFullYear()}-${String(
        startDateTime.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(startDateTime.getUTCDate()).padStart(
        2,
        "0"
      )}`;

      // Add one day to the end date for the query to include the full end day
      const endDateTimeInclusiveEnd = new Date(endDateTime);
      endDateTimeInclusiveEnd.setUTCDate(
        endDateTimeInclusiveEnd.getUTCDate() + 1
      );
      const formattedEndDate = `${endDateTimeInclusiveEnd.getUTCFullYear()}-${String(
        endDateTimeInclusiveEnd.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(
        endDateTimeInclusiveEnd.getUTCDate()
      ).padStart(2, "0")}`;

      let appointmentsQuery = supabase
        .from("appointments")
        .select("start_time, end_time, professional_id")
        .gte("start_time", `${formattedStartDate}T00:00:00Z`)
        .lt("start_time", `${formattedEndDate}T00:00:00Z`);

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
            // Filter this professional's appointments for this date (in UTC)
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
      // Fetch existing appointments for the professional on that day using UTC date boundaries
      let query = supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("professional_id", professionalId)
        .gte("start_time", `${date}T00:00:00Z`)
        .lt("start_time", `${date}T23:59:59Z`);

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
  // Work with UTC for all calculations
  const currentDate = new Date(`${dateStr}T00:00:00Z`);

  // Get the day of week based on UTC date
  const dayOfWeek = currentDate.getUTCDay();

  // Get business hours for this day
  const dayHours = businessHours.find((h) => h.day_of_week === dayOfWeek);

  // If business is closed on this day or hours not found, return empty array
  if (!dayHours || !dayHours.is_open) {
    return [];
  }

  // Parse business hours - these are stored in local time (e.g. "09:00")
  // but need to be treated as UTC hours for consistent calculations
  const [openHour, openMinute] = dayHours.open_time.split(":").map(Number);
  const [closeHour, closeMinute] = dayHours.close_time.split(":").map(Number);

  // Create UTC Date objects representing the business hours in UTC
  // We're treating the local hours as if they were UTC hours
  const dayStart = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate(),
      openHour,
      openMinute
    )
  );

  const dayEnd = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate(),
      closeHour,
      closeMinute
    )
  );

  // Initialize array of available slots
  const availableSlots: string[] = [];
  let currentSlot = new Date(dayStart);

  // Parse appointment times correctly as UTC Date objects
  const parsedAppointments = appointments.map((appointment) => {
    return {
      start_time: new Date(appointment.start_time),
      end_time: new Date(appointment.end_time),
      professional_id: appointment.professional_id,
    };
  });

  // Function to check if a time conflicts with existing appointments
  const hasConflict = (start: Date, end: Date) => {
    return parsedAppointments.some((appointment) => {
      const appointmentStart = appointment.start_time;
      const appointmentEnd = appointment.end_time;

      // Check for exact start time match or actual overlap
      // A slot conflicts if:
      // 1. It starts exactly when another appointment starts
      // 2. It overlaps with an existing appointment (standard overlap check)
      return (
        start.getTime() === appointmentStart.getTime() ||
        (start < appointmentEnd && appointmentStart < end)
      );
    });
  };

  // Function to check if a slot is in the past
  const isPast = (date: Date) => {
    const now = new Date();
    return date < now;
  };

  // Generate available slots every 15 minutes
  while (currentSlot < dayEnd) {
    // Calculate end time for service
    const serviceEnd = new Date(currentSlot);
    serviceEnd.setUTCMinutes(serviceEnd.getUTCMinutes() + serviceDuration);

    // Skip if service would end after business hours
    if (serviceEnd > dayEnd) {
      currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15);
      continue;
    }

    // Skip if there's a conflict with an existing appointment
    if (hasConflict(currentSlot, serviceEnd)) {
      currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15);
      continue;
    }

    // Skip if the slot is in the past
    if (isPast(currentSlot)) {
      currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15);
      continue;
    }

    // Se chegamos aqui, o slot está disponível - formato como HH:MM em UTC
    // IMPORTANTE: Este formato deve corresponder exatamente ao formato usado no frontend
    const hours = String(currentSlot.getUTCHours()).padStart(2, "0");
    const minutes = String(currentSlot.getUTCMinutes()).padStart(2, "0");
    availableSlots.push(`${hours}:${minutes}`);

    // Move to next 15-minute slot
    currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15);
  }

  return availableSlots;
}
