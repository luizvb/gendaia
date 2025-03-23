import { NextResponse, NextRequest } from "next/server";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { addDays, parse } from "date-fns";

// Set timezone for Brazil
const TIMEZONE = "America/Sao_Paulo";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const testDate = searchParams.get("date") || "2025-03-24";

  // Parse date consistently by explicitly converting to UTC first, then to Brazil timezone
  const utcDate = parse(testDate, "yyyy-MM-dd", new Date());
  // Force the date to be interpreted as midnight in Brazil timezone
  const dateObj = toZonedTime(
    new Date(
      `${testDate}T00:00:00.000${formatInTimeZone(
        new Date(),
        TIMEZONE,
        "xxx" // Get current timezone offset
      )}`
    ),
    TIMEZONE
  );

  // Generate data for the next 3 days
  const days = [];
  for (let i = 0; i < 3; i++) {
    const currentDate = addDays(dateObj, i);
    // Ensure consistent time zone handling
    const zonedDate = toZonedTime(currentDate, TIMEZONE);
    const formattedDate = formatInTimeZone(zonedDate, TIMEZONE, "yyyy-MM-dd");

    days.push({
      dateISO: currentDate.toISOString(),
      dateLocal: currentDate.toString(),
      dateZoned: zonedDate.toString(),
      formattedRegular: formattedDate,
      dayOfWeek: zonedDate.getDay(),
      businessHours: {
        open: formatInTimeZone(
          toZonedTime(
            parse(`${formattedDate} 09:00`, "yyyy-MM-dd HH:mm", new Date()),
            TIMEZONE
          ),
          TIMEZONE,
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        ),
        close: formatInTimeZone(
          toZonedTime(
            parse(`${formattedDate} 19:00`, "yyyy-MM-dd HH:mm", new Date()),
            TIMEZONE
          ),
          TIMEZONE,
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        ),
      },
      timestamps: {
        unix: zonedDate.getTime(),
        now: new Date().getTime(),
        isPast: zonedDate.getTime() < new Date().getTime(),
      },
    });
  }

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    serverTimeZoned: formatInTimeZone(
      new Date(),
      TIMEZONE,
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    ),
    timezone: TIMEZONE,
    testDate,
    days,
  });
}
