import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_TIMEZONE } from "@/lib/timezone";
import { getBusinessId } from "@/lib/business-id";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = "force-dynamic";

// Use timezone from utility
const TIMEZONE = DEFAULT_TIMEZONE;
// São Paulo timezone offset is typically UTC-3
const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

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

    const headerBusinessId = request.headers.get("X-Business-ID");
    const queryBusinessId = searchParams.get("business_id");

    // Get business ID from header, query param, or session
    let businessId;

    if (headerBusinessId) {
      businessId = headerBusinessId;
    } else if (queryBusinessId) {
      businessId = queryBusinessId;
    } else {
      // Create Supabase client
      const supabase = await createClient();

      // Try to get business ID from session
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      businessId = await getBusinessId(request);
    }

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
        .select("id, name, color, business_id, break_start, break_end")
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
              hours,
              professional.break_start,
              professional.break_end
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
      // Fetch the professional to get break time information
      const { data: professional, error: professionalError } = await supabase
        .from("professionals")
        .select("id, name, color, business_id, break_start, break_end")
        .eq("id", professionalId)
        .single();

      if (professionalError) {
        console.error("Error fetching professional:", professionalError);
        return NextResponse.json(
          { error: "Error fetching professional" },
          { status: 500 }
        );
      }

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
        hours,
        professional?.break_start,
        professional?.break_end
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
  businessHours: BusinessHours[],
  breakStart?: string,
  breakEnd?: string
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
  const [openHour, openMinute] = dayHours.open_time.split(":").map(Number);
  const [closeHour, closeMinute] = dayHours.close_time.split(":").map(Number);

  // Business hours in São Paulo time
  const spOpenTime = `${String(openHour).padStart(2, "0")}:${String(
    openMinute
  ).padStart(2, "0")}`;
  const spCloseTime = `${String(closeHour).padStart(2, "0")}:${String(
    closeMinute
  ).padStart(2, "0")}`;

  // Calculate UTC times that correspond to the business hours in São Paulo time
  // São Paulo is typically UTC-3, so we need to add 3 hours to convert from SP to UTC
  const utcOffset = 3; // São Paulo to UTC offset

  // Create UTC Date objects representing the business hours
  const dayStart = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate(),
      openHour + utcOffset,
      openMinute
    )
  );

  const dayEnd = new Date(
    Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate(),
      closeHour + utcOffset,
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
    // Check if this time slot is within the professional's break time
    if (breakStart && breakEnd) {
      try {
        // Convert slot times to São Paulo time for direct comparison with break times
        const slotStartSP = convertToSaoPauloTime(start);
        const slotEndSP = convertToSaoPauloTime(
          new Date(end.getTime() - 60000)
        ); // -1 minute to avoid edge case conflicts

        // Helper function to compare times as strings (HH:MM format)
        const isTimeInRange = (
          time: string,
          rangeStart: string,
          rangeEnd: string
        ) => {
          return time >= rangeStart && time < rangeEnd;
        };

        // Debug logs
        console.log("Checking slot (SP time):", slotStartSP, "-", slotEndSP);
        console.log("Break time (SP time):", breakStart, "-", breakEnd);

        // Check if either the start or end time is during the break
        const startsInBreak = isTimeInRange(slotStartSP, breakStart, breakEnd);
        const endsInBreak = isTimeInRange(slotEndSP, breakStart, breakEnd);

        // Check if the slot completely contains the break
        const containsBreak =
          slotStartSP <= breakStart && slotEndSP >= breakEnd;

        const hasBreakTimeConflict =
          startsInBreak || endsInBreak || containsBreak;

        if (hasBreakTimeConflict) {
          console.log("BREAK TIME CONFLICT DETECTED");
          console.log(
            `Slot ${slotStartSP}-${slotEndSP} conflicts with break ${breakStart}-${breakEnd}`
          );
          return true;
        }
      } catch (error) {
        console.error("Error checking break time conflict:", error);
      }
    }

    const appointmentConflict = parsedAppointments.some((appointment) => {
      const appointmentStart = appointment.start_time;
      const appointmentEnd = appointment.end_time;

      // Check for exact start time match or actual overlap
      return (
        start.getTime() === appointmentStart.getTime() ||
        (start < appointmentEnd && appointmentStart < end)
      );
    });

    if (appointmentConflict) {
      console.log("APPOINTMENT CONFLICT DETECTED");
    }

    return appointmentConflict;
  };

  // Function to check if a slot is in the past
  const isPast = (date: Date) => {
    const now = new Date();
    return date < now;
  };

  // Function to convert UTC time to São Paulo time (formatted as HH:MM)
  const convertToSaoPauloTime = (utcDate: Date): string => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: SAO_PAULO_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    // Format and extract just the time part, ensuring HH:MM format
    const formattedTime = formatter.format(utcDate);
    // Extract hours and minutes from the formatted string (format varies by browser)
    const timeMatch = formattedTime.match(/(\d{1,2}):(\d{2})/);

    if (timeMatch) {
      const hours = String(timeMatch[1]).padStart(2, "0");
      const minutes = timeMatch[2];
      return `${hours}:${minutes}`;
    }

    // Fallback if regex fails (shouldn't happen)
    return formattedTime.replace(/[^0-9:]/g, "");
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

    // Convert the UTC slot time to São Paulo time
    const saoPauloTimeSlot = convertToSaoPauloTime(currentSlot);

    // Only add slots that fall within the São Paulo business hours
    if (saoPauloTimeSlot >= spOpenTime && saoPauloTimeSlot < spCloseTime) {
      availableSlots.push(saoPauloTimeSlot);
    }

    // Move to next 15-minute slot
    currentSlot.setUTCMinutes(currentSlot.getUTCMinutes() + 15);
  }

  return availableSlots;
}
