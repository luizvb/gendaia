import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { parse, format } from "date-fns";

// Default timezone for the application
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";

/**
 * Creates a date in the specified timezone
 * This ensures the date is correctly interpreted in the target timezone
 * regardless of server timezone
 */
export function createTzDate(
  dateString: string,
  formatStr: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  // First parse the date to get a standard JS Date object
  const parsedDate = parse(dateString, formatStr, new Date());

  // Then convert it to the target timezone
  return toZonedTime(parsedDate, timezone);
}

/**
 * Formats a date according to the specified timezone and format
 */
export function formatTzDate(
  date: Date,
  formatStr: string,
  timezone: string = DEFAULT_TIMEZONE
): string {
  return formatInTimeZone(date, timezone, formatStr);
}

/**
 * Converts a standard date to a date in the specified timezone
 */
export function toTimeZone(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  return toZonedTime(date, timezone);
}

/**
 * Gets the current time in the specified timezone
 */
export function nowInTimeZone(timezone: string = DEFAULT_TIMEZONE): Date {
  return toZonedTime(new Date(), timezone);
}

/**
 * Parses a date string with time in the specified timezone
 * For example: "2025-03-24 09:00" in format "yyyy-MM-dd HH:mm"
 */
export function parseDateTimeInTz(
  dateTimeStr: string,
  formatStr: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const parsedDate = parse(dateTimeStr, formatStr, new Date());
  return toZonedTime(parsedDate, timezone);
}

/**
 * Returns debug information about a date in a specific timezone
 */
export function getTzDebugInfo(
  date: Date,
  timezone: string = DEFAULT_TIMEZONE
) {
  const zonedDate = toZonedTime(date, timezone);

  return {
    isoString: date.toISOString(),
    isoWithOffset: formatInTimeZone(
      date,
      timezone,
      "yyyy-MM-dd'T'HH:mm:ss.SSSXXX"
    ),
    formattedDate: formatInTimeZone(date, timezone, "yyyy-MM-dd"),
    formattedTime: formatInTimeZone(date, timezone, "HH:mm:ss"),
    timezone,
    offset: formatInTimeZone(date, timezone, "XXX"),
    rawDate: zonedDate.toString(),
    utcString: date.toUTCString(),
    localString: date.toString(),
    zonedString: zonedDate.toString(),
    timestamp: date.getTime(),
  };
}
