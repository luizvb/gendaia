import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the user's session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's business ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", session.user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const businessId = profile.business_id;

    // Get the agent settings for this business
    const { data: settings, error: settingsError } = await supabase
      .from("whatsapp_agent_settings")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (settingsError && settingsError.code !== "PGRST116") {
      // PGRST116 is the error code for no rows returned
      return NextResponse.json(
        { error: "Failed to fetch agent settings" },
        { status: 500 }
      );
    }

    // If no settings exist, return default settings
    if (!settings) {
      return NextResponse.json({
        enabled: false,
        name: "Luiza",
        personality: "professional",
        description:
          "Sou especialista em agendamento de serviços. Posso ajudar com dúvidas sobre serviços, profissionais e disponibilidade de horários.",
        data_collection: true,
        auto_booking: false,
        delay_response: true,
        topic_restriction: true,
        allowed_topics: "agendamento de serviços",
      });
    }

    // Return the settings
    return NextResponse.json({
      enabled: settings.enabled,
      name: settings.name,
      personality: settings.personality,
      description: settings.description,
      data_collection: settings.data_collection,
      auto_booking: settings.auto_booking,
      delay_response: settings.delay_response,
      topic_restriction: settings.topic_restriction,
      allowed_topics: settings.allowed_topics,
    });
  } catch (error) {
    console.error("Error fetching agent settings:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the user's session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's business ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", session.user.id)
      .single();

    if (profileError || !profile?.business_id) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const businessId = profile.business_id;

    // Parse the request body
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Validate the request body
    const {
      enabled,
      name,
      personality,
      description,
      data_collection,
      auto_booking,
      delay_response,
      topic_restriction,
      allowed_topics,
    } = body;

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    // Check if settings already exist for this business
    const { data: existingSettings } = await supabase
      .from("whatsapp_agent_settings")
      .select("id")
      .eq("business_id", businessId);

    let result;

    if (existingSettings && existingSettings.length > 0) {
      // Update existing settings
      result = await supabase
        .from("whatsapp_agent_settings")
        .update({
          enabled,
          name,
          personality,
          description,
          data_collection,
          auto_booking,
          delay_response,
          topic_restriction,
          allowed_topics,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);
    } else {
      // Insert new settings
      result = await supabase.from("whatsapp_agent_settings").insert({
        business_id: businessId,
        enabled,
        name,
        personality,
        description,
        data_collection,
        auto_booking,
        delay_response,
        topic_restriction,
        allowed_topics,
      });
    }

    if (result.error) {
      return NextResponse.json(
        { error: "Failed to save agent settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving agent settings:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
