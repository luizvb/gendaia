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
import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { getBusinessId } from "@/lib/business-id";

// Mark this route as dynamic to avoid static generation errors
export const dynamic = "force-dynamic";

// Set timezone for Brazil
const TIMEZONE = "America/Sao_Paulo";

// Debug mode setting - set to true to enable detailed logging
const DEBUG_MODE = true;

// Helper logging function
const debugLog = (message: string, data: any) => {
  if (DEBUG_MODE) {
    console.log(`DEBUG: ${message}`, JSON.stringify(data, null, 2));
  }
};

// Always log function for critical information - will show in production and development
const alwaysLog = (message: string, data: any) => {
  console.log(`CRITICAL LOG: ${message}`, JSON.stringify(data, null, 2));
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

    // Log request parameters
    debugLog("Request parameters", {
      professionalId,
      date,
      startDate,
      endDate,
      serviceDuration,
      timezone: TIMEZONE,
      serverTime: new Date().toISOString(),
      serverTimeInBrazil: formatInTimeZone(
        new Date(),
        TIMEZONE,
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),
    });

    // Always log critical timezone information
    alwaysLog("Timezone check", {
      timezone: TIMEZONE,
      serverTime: new Date().toISOString(),
      serverTimeInBrazil: formatInTimeZone(
        new Date(),
        TIMEZONE,
        "yyyy-MM-dd'T'HH:mm:ssXXX"
      ),
      requestParams: {
        professionalId,
        date,
        startDate,
        endDate,
      },
    });

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
        // Get timezone offset once
        const offset = formatInTimeZone(new Date(), TIMEZONE, "xxx");

        // Create dates with explicit timezone information
        startDateTime = new Date(`${startDate}T00:00:00.000${offset}`);
        endDateTime = new Date(`${endDate}T00:00:00.000${offset}`);

        alwaysLog("Using provided date range", {
          startDateInput: startDate,
          endDateInput: endDate,
          offset,
          parsedStartDate: startDateTime.toISOString(),
          parsedEndDate: endDateTime.toISOString(),
        });
      } else {
        // Use days ahead from today in the specified timezone
        const offset = formatInTimeZone(new Date(), TIMEZONE, "xxx");
        const todayFormatted = formatInTimeZone(
          new Date(),
          TIMEZONE,
          "yyyy-MM-dd"
        );
        const nowWithTz = new Date(`${todayFormatted}T00:00:00.000${offset}`);

        startDateTime = nowWithTz;
        endDateTime = addDays(nowWithTz, daysAhead - 1);

        alwaysLog("Using days ahead", {
          daysAhead,
          offset,
          todayFormatted,
          parsedStartDate: startDateTime.toISOString(),
          parsedEndDate: endDateTime.toISOString(),
        });
      }

      // Log calculated date range and always log key date information
      debugLog("Date range", {
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        startDateTimeFormatted: formatInTimeZone(
          startDateTime,
          TIMEZONE,
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        ),
        endDateTimeFormatted: formatInTimeZone(
          endDateTime,
          TIMEZONE,
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        ),
      });

      alwaysLog("Date range calculation result", {
        startDate: startDate,
        endDate: endDate,
        daysAhead: daysAhead,
        calculatedStartDate: formatInTimeZone(
          startDateTime,
          TIMEZONE,
          "yyyy-MM-dd"
        ),
        calculatedEndDate: formatInTimeZone(
          endDateTime,
          TIMEZONE,
          "yyyy-MM-dd"
        ),
      });

      // Generate dates for the specified interval
      const dates: string[] = [];
      let currentDate = startDateTime;
      while (currentDate <= endDateTime) {
        // Convert to local date in the specified timezone for formatting
        dates.push(formatInTimeZone(currentDate, TIMEZONE, "yyyy-MM-dd"));
        currentDate = addDays(currentDate, 1);
      }

      // Fetch all appointments for the interval
      const formattedStartDate = formatInTimeZone(
        startDateTime,
        TIMEZONE,
        "yyyy-MM-dd"
      );
      const formattedEndDate = formatInTimeZone(
        addDays(endDateTime, 1),
        TIMEZONE,
        "yyyy-MM-dd"
      );

      debugLog("Formatted date range for query", {
        formattedStartDate,
        formattedEndDate,
        queryStart: `${formattedStartDate}T00:00:00`,
        queryEnd: `${formattedEndDate}T00:00:00`,
      });

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

      // For specific debugging cases, add detailed logs for a professional
      if (professionals.length > 0) {
        const firstProfessional = professionals[0];
        if (dates.length > 0) {
          const firstDate = dates[0];
          const professionalAppointments = allAppointments.filter(
            (app: Appointment) =>
              app.professional_id === firstProfessional.id &&
              app.start_time.startsWith(firstDate)
          );

          debugLog(
            `Debug availability calculation for professional ${firstProfessional.id} on ${firstDate}`,
            {
              professionalId: firstProfessional.id,
              date: firstDate,
              appointments: professionalAppointments,
              businessHours: hours.find(
                (h) =>
                  h.day_of_week ===
                  toZonedTime(
                    parse(firstDate, "yyyy-MM-dd", new Date()),
                    TIMEZONE
                  ).getDay()
              ),
            }
          );
        }
      }

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
  // Get the timezone offset once to use consistently
  const offset = formatInTimeZone(new Date(), TIMEZONE, "xxx");

  // Create a date string with explicit timezone info
  const dateWithTzString = `${dateStr}T00:00:00.000${offset}`;
  const currentDate = new Date(dateWithTzString);

  // Log critical information about the date
  alwaysLog(`Calculating availability for date ${dateStr}`, {
    inputDateStr: dateStr,
    dateWithTzString: dateWithTzString,
    currentDateISO: currentDate.toISOString(),
    currentDateFormatted: formatInTimeZone(currentDate, TIMEZONE, "yyyy-MM-dd"),
    currentDateWithTZ: formatInTimeZone(
      currentDate,
      TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    ),
    offset: offset,
  });

  // Get the day of week in the target timezone (0 = Sunday, 1 = Monday, etc.)
  const dayOfWeek = Number(formatInTimeZone(currentDate, TIMEZONE, "e")) % 7;

  // Get business hours for this day
  const dayHours = businessHours.find((h) => h.day_of_week === dayOfWeek);

  // If business is closed on this day or hours not found, return empty array
  if (!dayHours || !dayHours.is_open) {
    debugLog(`Business closed on ${dateStr}`, { dayOfWeek, dayHours });
    return [];
  }

  // Parse business hours - make sure to create date objects in the target timezone
  const formattedDate = formatInTimeZone(currentDate, TIMEZONE, "yyyy-MM-dd");

  // Construct business hours dates using the formatted date and explicit timezone offset
  const openTimeStr = `${formattedDate}T${dayHours.open_time}:00${offset}`;
  const closeTimeStr = `${formattedDate}T${dayHours.close_time}:00${offset}`;

  // Create Date objects from ISO strings with timezone
  const dayStart = new Date(openTimeStr);
  const dayEnd = new Date(closeTimeStr);

  // Log business hours
  alwaysLog(`Business hours for ${dateStr}`, {
    openTimeRaw: dayHours.open_time,
    closeTimeRaw: dayHours.close_time,
    openTimeStr,
    closeTimeStr,
    dayStartISO: dayStart.toISOString(),
    dayEndISO: dayEnd.toISOString(),
    dayStartFormatted: formatInTimeZone(
      dayStart,
      TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    ),
    dayEndFormatted: formatInTimeZone(
      dayEnd,
      TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    ),
    appointmentsCount: appointments.length,
  });

  // Initialize array of available slots
  const availableSlots: string[] = [];
  let currentSlot = dayStart;

  // Convert all appointment times to our timezone explicitly
  const zonedAppointments = appointments.map((appointment) => {
    const startTime = new Date(appointment.start_time);
    const endTime = new Date(appointment.end_time);
    return {
      start_time: startTime,
      end_time: endTime,
      professional_id: appointment.professional_id,
      raw_start: appointment.start_time,
      raw_end: appointment.end_time,
    };
  });

  // Function to check if a time conflicts with existing appointments
  const hasConflict = (start: Date, end: Date) => {
    for (const appointment of zonedAppointments) {
      const appointmentStart = appointment.start_time;
      const appointmentEnd = appointment.end_time;

      // Check for overlap between intervals
      if (
        (start < appointmentEnd && end > appointmentStart) ||
        // Also check specific cases of exact start/end
        start.getTime() === appointmentStart.getTime() ||
        end.getTime() === appointmentEnd.getTime() ||
        // Check if slot is completely within an appointment
        (start >= appointmentStart && end <= appointmentEnd) ||
        // Check if appointment is completely within slot
        (appointmentStart >= start && appointmentEnd <= end)
      ) {
        return true;
      }
    }
    return false;
  };

  // Function to check if a slot is in the past
  const isPast = (date: Date) => {
    // Create a now date with explicit timezone info
    const nowStr =
      formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss") + offset;

    const nowWithTz = new Date(nowStr);
    return date < nowWithTz;
  };

  // Count slots processed for debugging
  let processedSlots = 0;
  let availableCount = 0;
  let pastCount = 0;
  let conflictCount = 0;
  let outOfRangeCount = 0;

  // Generate available slots every 15 minutes
  while (currentSlot < dayEnd) {
    processedSlots++;
    // For each 15-minute slot, we check if a service with the given duration would fit
    const serviceEnd = addMinutes(currentSlot, serviceDuration);

    // Skip out of range slots
    if (serviceEnd > dayEnd) {
      outOfRangeCount++;
      currentSlot = addMinutes(currentSlot, 15);
      continue;
    }

    // Check conflicts
    const hasTimeConflict = hasConflict(currentSlot, serviceEnd);
    if (hasTimeConflict) {
      conflictCount++;
      currentSlot = addMinutes(currentSlot, 15);
      continue;
    }

    // Check if in past
    const isInPast = isPast(currentSlot);
    if (isInPast) {
      pastCount++;
      currentSlot = addMinutes(currentSlot, 15);
      continue;
    }

    // If we get here, the slot is available
    availableCount++;
    // Format the time consistently to ensure it works in all environments
    availableSlots.push(formatInTimeZone(currentSlot, TIMEZONE, "HH:mm"));

    // Move to next 15-minute slot
    currentSlot = addMinutes(currentSlot, 15);
  }

  // Log availability results
  alwaysLog(`Final availability for ${dateStr}`, {
    totalProcessed: processedSlots,
    availableCount,
    pastCount,
    conflictCount,
    outOfRangeCount,
    availableSlots,
    dateProcessed: dateStr,
    dayOfWeek: dayOfWeek,
  });

  return availableSlots;
}
