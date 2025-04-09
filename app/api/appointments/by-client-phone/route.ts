import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";

export const GET = async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (!phone) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const businessIdFromQuery = searchParams.get("business_id");
    const headerBusinessId = request.headers.get("X-Business-ID");

    let businessId: string | null = null;

    // If business_id is provided in query or header, use it directly
    if (businessIdFromQuery) {
      businessId = businessIdFromQuery;
    } else if (headerBusinessId) {
      businessId = headerBusinessId;
    } else {
      // Otherwise check auth and get business_id from session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get the business_id using our utility function
      businessId = await getBusinessId(request);
    }

    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // First find the client by phone
    const { data: client, error: clientError } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", phone)
      .eq("business_id", businessId)
      .maybeSingle();

    if (clientError) {
      console.error("Error finding client:", clientError);
      return NextResponse.json(
        { error: "Failed to find client" },
        { status: 500 }
      );
    }

    if (!client) {
      return NextResponse.json(
        { error: "No client found with this phone number" },
        { status: 404 }
      );
    }

    // Query appointments with client data
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        clients:client_id (id, name, phone),
        professionals:professional_id (id, name),
        services:service_id (id, name, duration, price)
      `
      )
      .eq("client_id", client.id)
      .eq("business_id", businessId)
      .order("start_time", { ascending: false });

    if (error) {
      console.error("Error fetching appointments:", error);
      return NextResponse.json(
        { error: "Failed to fetch appointments" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in appointments by client phone API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
