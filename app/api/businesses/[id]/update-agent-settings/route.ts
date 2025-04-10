import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Updates AI agent settings based on business details
 * This endpoint synchronizes the AI agent settings with the business description
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get the user's session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the user has access to this business
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", session.user.id)
      .single();

    if (!profile || profile.business_id !== params.id) {
      return NextResponse.json(
        { error: "Not authorized to update this business" },
        { status: 403 }
      );
    }

    const businessId = params.id;

    // Get the business details
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("name, description")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Check if agent settings already exist
    const { data: existingSettings } = await supabase
      .from("whatsapp_agent_settings")
      .select("id, allowed_topics")
      .eq("business_id", businessId)
      .single();

    // Update or create agent settings
    let result;

    // Default allowed topics
    const defaultTopics = "agendamento de serviços";

    // Always include the business description if it exists
    let allowedTopics = defaultTopics;
    if (business.description) {
      allowedTopics = `${defaultTopics}, ${business.description}`;
    }

    if (existingSettings) {
      // Update existing settings
      result = await supabase
        .from("whatsapp_agent_settings")
        .update({
          allowed_topics: allowedTopics,
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId);
    } else {
      // Create new settings with defaults
      result = await supabase.from("whatsapp_agent_settings").insert({
        business_id: businessId,
        enabled: false,
        name: "Luiza",
        personality: "professional",
        description:
          "Sou especialista em agendamento de serviços. Posso ajudar com dúvidas sobre serviços, profissionais e disponibilidade de horários.",
        data_collection: true,
        auto_booking: false,
        delay_response: true,
        topic_restriction: true,
        allowed_topics: allowedTopics,
      });
    }

    if (result.error) {
      return NextResponse.json(
        { error: "Failed to update agent settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Agent settings synchronized with business description",
    });
  } catch (error) {
    console.error("Error updating agent settings:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
