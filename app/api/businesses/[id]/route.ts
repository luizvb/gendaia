import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
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
    const updateData = await req.json();

    // Update the business data
    const { data: updatedBusiness, error: updateError } = await supabase
      .from("businesses")
      .update(updateData)
      .eq("id", businessId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update business" },
        { status: 500 }
      );
    }

    // If description was updated, also update the AI agent settings
    if (updateData.description !== undefined) {
      try {
        // Check if agent settings already exist
        const { data: existingSettings } = await supabase
          .from("whatsapp_agent_settings")
          .select("id, allowed_topics")
          .eq("business_id", businessId)
          .single();

        // Default allowed topics
        const defaultTopics = "agendamento de serviços";

        // Always include the business description if it exists
        let allowedTopics = defaultTopics;
        if (updateData.description) {
          allowedTopics = `${defaultTopics}, ${updateData.description}`;
        }

        if (existingSettings) {
          // Update existing settings
          await supabase
            .from("whatsapp_agent_settings")
            .update({
              allowed_topics: allowedTopics,
              updated_at: new Date().toISOString(),
            })
            .eq("business_id", businessId);
        } else {
          // Create new settings with defaults
          await supabase.from("whatsapp_agent_settings").insert({
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
      } catch (error) {
        console.error("Error updating AI agent settings:", error);
        // Continue even if agent settings update fails
      }
    }

    return NextResponse.json(updatedBusiness);
  } catch (error) {
    console.error("Error updating business:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
