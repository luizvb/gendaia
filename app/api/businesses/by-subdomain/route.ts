import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get("subdomain");

    if (!subdomain) {
      return NextResponse.json(
        { error: "Subdomain parameter is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Ensure lowercase for case-insensitive comparison
    const normalizedSubdomain = subdomain.toLowerCase();

    console.log("Searching for subdomain:", normalizedSubdomain);
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .ilike("subdomain", normalizedSubdomain)
      .single();

    if (error) {
      console.error("Error fetching business by subdomain:", error);
      if (error.code === "PGRST116") {
        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(business);
  } catch (error) {
    console.error("Error fetching business by subdomain:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// No authentication required for this endpoint
export const dynamic = "force-dynamic";
