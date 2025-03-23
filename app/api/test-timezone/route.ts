import { NextResponse, NextRequest } from "next/server";
import { formatInTimeZone } from "date-fns-tz";
import { addDays } from "date-fns";

// Set timezone for Brazil
const TIMEZONE = "America/Sao_Paulo";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const testDate = searchParams.get("date") || "2025-03-24";

  // Create a specific date string in ISO format with the target timezone offset
  // This is the key change - we explicitly construct a date that includes timezone info
  const offset = formatInTimeZone(new Date(), TIMEZONE, "xxx");
  const startISOString = `${testDate}T00:00:00.000${offset}`;

  // Create Date object from the ISO string
  const dateObj = new Date(startISOString);

  // Generate data for the next 3 days
  const days = [];
  for (let i = 0; i < 3; i++) {
    const currentDate = addDays(dateObj, i);
    const formattedDate = formatInTimeZone(currentDate, TIMEZONE, "yyyy-MM-dd");

    // Create time strings directly with timezone info
    const openTimeStr = `${formattedDate}T09:00:00${offset}`;
    const closeTimeStr = `${formattedDate}T19:00:00${offset}`;

    // Get day of week in target timezone
    const dayOfWeek = Number(formatInTimeZone(currentDate, TIMEZONE, "e")) % 7; // 0-6, Sunday-Saturday

    days.push({
      dateInfo: {
        isoWithOffset: startISOString,
        rawDate: dateObj.toString(),
        currentTimeString: formatInTimeZone(
          new Date(),
          TIMEZONE,
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        ),
        offset: offset,
      },
      dateISO: currentDate.toISOString(),
      dateLocal: currentDate.toString(),
      formattedDateInTZ: formattedDate,
      localDayOfWeek: dayOfWeek,
      businessHours: {
        open: formatInTimeZone(
          new Date(openTimeStr),
          TIMEZONE,
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        ),
        close: formatInTimeZone(
          new Date(closeTimeStr),
          TIMEZONE,
          "yyyy-MM-dd'T'HH:mm:ssXXX"
        ),
      },
      timestamps: {
        unix: currentDate.getTime(),
        now: new Date().getTime(),
        isPast: currentDate.getTime() < new Date().getTime(),
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
