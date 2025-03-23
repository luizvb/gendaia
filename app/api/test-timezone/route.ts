import { NextResponse, NextRequest } from "next/server";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { addDays, parse } from "date-fns";

// Set timezone for Brazil
const TIMEZONE = "America/Sao_Paulo";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const testDate = searchParams.get("date") || "2025-03-24";
  const dateObj = parse(testDate, "yyyy-MM-dd", new Date());

  // Generate data for the next 3 days
  const days = [];
  for (let i = 0; i < 3; i++) {
    const currentDate = addDays(dateObj, i);
    const zonedDate = toZonedTime(currentDate, TIMEZONE);

    days.push({
      dateISO: currentDate.toISOString(),
      dateLocal: currentDate.toString(),
      dateZoned: zonedDate.toString(),
      formattedRegular: formatInTimeZone(currentDate, TIMEZONE, "yyyy-MM-dd"),
      dayOfWeek: zonedDate.getDay(),
      businessHours: {
        open: formatInTimeZone(
          toZonedTime(
            parse(
              `${formatInTimeZone(zonedDate, TIMEZONE, "yyyy-MM-dd")} 09:00`,
              "yyyy-MM-dd HH:mm",
              new Date()
            ),
            TIMEZONE
          ),
          TIMEZONE,
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        ),
        close: formatInTimeZone(
          toZonedTime(
            parse(
              `${formatInTimeZone(zonedDate, TIMEZONE, "yyyy-MM-dd")} 19:00`,
              "yyyy-MM-dd HH:mm",
              new Date()
            ),
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
