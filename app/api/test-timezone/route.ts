import { NextResponse, NextRequest } from "next/server";
import { addDays, format, parse } from "date-fns";
import {
  DEFAULT_TIMEZONE,
  createTzDate,
  formatTzDate,
  nowInTimeZone,
  parseDateTimeInTz,
  getTzDebugInfo,
  debugEnvironmentDifferences,
} from "@/lib/timezone";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const testDate = searchParams.get("date") || "2025-03-24";

  // Get environment diagnostic information
  const envDiagnostics = debugEnvironmentDifferences();

  // Use our helper function to create a date in the Brazil timezone
  const dateObj = createTzDate(testDate, "yyyy-MM-dd");

  // Generate data for the next 3 days
  const days = [];
  for (let i = 0; i < 3; i++) {
    // Add days to the zoned date and ensure it stays in the timezone
    const currentDate = addDays(dateObj, i);

    // Get the date in yyyy-MM-dd format for the current timezone
    const formattedDate = formatTzDate(currentDate, "yyyy-MM-dd");

    // Create business hours for this date
    // Create date objects for 9AM and 7PM on the SAME DAY as formattedDate
    const openTime = parseDateTimeInTz(
      `${formattedDate} 09:00`,
      "yyyy-MM-dd HH:mm"
    );
    const closeTime = parseDateTimeInTz(
      `${formattedDate} 19:00`,
      "yyyy-MM-dd HH:mm"
    );

    days.push({
      // Add debug info for comprehensive timezone debugging
      dateInfo: getTzDebugInfo(currentDate),

      dateISO: currentDate.toISOString(),
      dateLocal: currentDate.toString(),
      formattedDateInTZ: formattedDate,
      localDayOfWeek: currentDate.getDay(),

      businessHours: {
        open: formatTzDate(openTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
        close: formatTzDate(closeTime, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      },

      timestamps: {
        unix: currentDate.getTime(),
        now: new Date().getTime(),
        isPast: currentDate.getTime() < new Date().getTime(),
      },
    });
  }

  // Get current time in the target timezone
  const now = nowInTimeZone();

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    serverTimeZoned: formatTzDate(now, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    timezone: DEFAULT_TIMEZONE,
    testDate,
    timezoneInfo: getTzDebugInfo(now),
    environmentDiagnostics: envDiagnostics,
    days,
  });
}
