import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Gets the business_id from the request headers or fetches it from the database if not available
 * @param request The Next.js request object
 * @returns The business_id or null if not found
 */
export async function getBusinessId(
  request: NextRequest
): Promise<string | null> {
  // First try to get from headers (set by middleware)
  const businessIdFromHeader = request.headers.get("x-business-id");
  if (businessIdFromHeader) {
    return businessIdFromHeader;
  }

  // If not in headers, fetch from database as fallback
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", user.id)
      .single();

    return profile?.business_id || null;
  } catch (error) {
    console.error("Error fetching business_id:", error);
    return null;
  }
}
