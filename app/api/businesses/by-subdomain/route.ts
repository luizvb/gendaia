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

    // Convert hyphen to space and prepare for case-insensitive search
    const formattedSearchName = subdomain.replace(/-/g, " ");

    console.log("Searching for:", formattedSearchName);
    const { data: business, error } = await supabase
      .from("businesses")
      .select("*")
      .or(
        `subdomain.ilike.%${formattedSearchName}%,name.ilike.%${formattedSearchName}%`
      )
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
