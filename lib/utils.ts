import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a phone number to Brazilian format
 * Example: +55 (11) 99999-9999
 */
export function formatPhoneNumber(value: string) {
  if (!value) return "+55 ";

  // Remove any non-digit characters
  let phoneNumber = value.replace(/\D/g, "");

  // If the user is trying to change the country code, preserve their input
  if (value.startsWith("+") && value.length <= 3) {
    return value;
  }

  // If phone doesn't start with country code, add Brazilian code
  if (!phoneNumber.startsWith("55")) {
    phoneNumber = "55" + phoneNumber;
  }

  // Format as Brazilian phone number
  if (phoneNumber.length <= 2) {
    return `+${phoneNumber}`;
  } else if (phoneNumber.length <= 4) {
    return `+${phoneNumber.slice(0, 2)} (${phoneNumber.slice(2)}`;
  } else if (phoneNumber.length <= 9) {
    return `+${phoneNumber.slice(0, 2)} (${phoneNumber.slice(
      2,
      4
    )}) ${phoneNumber.slice(4)}`;
  } else {
    return `+${phoneNumber.slice(0, 2)} (${phoneNumber.slice(
      2,
      4
    )}) ${phoneNumber.slice(4, 9)}-${phoneNumber.slice(9, 13)}`;
  }
}

/**
 * Normalizes a phone number to the format expected by the API
 * Example: 5511999999999
 */
export function normalizePhoneNumber(value: string) {
  // Remove any non-digit characters
  let phoneNumber = value.replace(/\D/g, "");

  // Ensure it starts with Brazil's country code
  if (!phoneNumber.startsWith("55")) {
    phoneNumber = "55" + phoneNumber;
  }

  return phoneNumber;
}
