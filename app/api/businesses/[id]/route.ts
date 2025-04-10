import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Get the authenticated user (more secure than getSession)
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // Verify the user has access to this business
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", userId)
      .single();

    if (profileError) {
      console.error("Profile error:", profileError);
      return NextResponse.json(
        {
          error: "Failed to fetch user profile",
          details: profileError.message,
        },
        { status: 500 }
      );
    }

    if (!profile || profile.business_id !== params.id) {
      return NextResponse.json(
        { error: "Not authorized to update this business" },
        { status: 403 }
      );
    }

    const businessId = params.id;
    let updateData;

    try {
      updateData = await req.json();
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Update the business data
    const { data: updatedBusiness, error: updateError } = await supabase
      .from("businesses")
      .update(updateData)
      .eq("id", businessId)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating business:", updateError);
      return NextResponse.json(
        { error: "Failed to update business", details: updateError.message },
        { status: 500 }
      );
    }

    // If description was updated, also update the AI agent settings
    if (updateData.description !== undefined) {
      try {
        // Check if the allowed_topics column exists
        let allowedTopicsExists = true;
        try {
          const { error: columnCheckError } = await supabase
            .from("whatsapp_agent_settings")
            .select("allowed_topics")
            .limit(1);

          if (
            columnCheckError &&
            columnCheckError.message?.includes("allowed_topics")
          ) {
            allowedTopicsExists = false;
            console.log(
              "allowed_topics column doesn't exist yet, will skip updating it"
            );
          }
        } catch (columnError) {
          allowedTopicsExists = false;
          console.log("Error checking allowed_topics column:", columnError);
        }

        // Only proceed with allowed_topics update if the column exists
        if (!allowedTopicsExists) {
          console.log(
            "Skipping agent settings update because allowed_topics column doesn't exist"
          );
          return NextResponse.json(updatedBusiness);
        }

        // Check if agent settings already exist
        const { data: existingSettings, error: settingsError } = await supabase
          .from("whatsapp_agent_settings")
          .select("id, allowed_topics")
          .eq("business_id", businessId)
          .single();

        if (
          settingsError &&
          settingsError.code !== "PGRST116" &&
          !settingsError.message?.includes("allowed_topics")
        ) {
          // Log but don't return error - continue with business update
          console.error("Error fetching agent settings:", settingsError);
        }

        // Default allowed topics
        const defaultTopics = "agendamento de serviços";

        // Always include the business description if it exists
        let allowedTopics = defaultTopics;
        if (updateData.description) {
          allowedTopics = `${defaultTopics}, ${updateData.description}`;
        }

        let agentUpdateResult;
        if (existingSettings) {
          // Update existing settings
          agentUpdateResult = await supabase
            .from("whatsapp_agent_settings")
            .update({
              allowed_topics: allowedTopics,
              updated_at: new Date().toISOString(),
            })
            .eq("business_id", businessId);
        } else {
          // Create new settings with defaults
          agentUpdateResult = await supabase
            .from("whatsapp_agent_settings")
            .insert({
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

        if (agentUpdateResult.error) {
          // If error is about allowed_topics column, just log and continue
          if (
            agentUpdateResult.error.code === "PGRST204" &&
            agentUpdateResult.error.message?.includes("allowed_topics")
          ) {
            console.log(
              "Column allowed_topics not found. Skipping this update."
            );
          } else {
            // Log but don't return error - continue with business update
            console.error(
              "Error updating AI agent settings:",
              agentUpdateResult.error
            );
          }
        }
      } catch (agentError) {
        console.error("Error updating AI agent settings:", agentError);
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
