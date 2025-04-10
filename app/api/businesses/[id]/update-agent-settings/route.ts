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

    // Get the business details
    const { data: business, error: businessError } = await supabase
      .from("businesses")
      .select("name, description")
      .eq("id", businessId)
      .single();

    if (businessError) {
      console.error("Business error:", businessError);
      return NextResponse.json(
        {
          error: "Failed to fetch business details",
          details: businessError.message,
        },
        { status: 500 }
      );
    }

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
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
      // PGRST116 is the error code for no rows returned
      // Skip column not found errors for allowed_topics
      console.error("Settings error:", settingsError);
      return NextResponse.json(
        {
          error: "Failed to fetch agent settings",
          details: settingsError.message,
        },
        { status: 500 }
      );
    }

    // Update or create agent settings
    let result;

    // Default allowed topics
    const defaultTopics = "agendamento de serviços";

    // Always include the business description if it exists
    let allowedTopics = defaultTopics;
    if (business.description) {
      allowedTopics = `${defaultTopics}, ${business.description}`;
    }

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

    try {
      if (existingSettings) {
        // Update existing settings
        const updateData: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        // Only include allowed_topics if the column exists
        if (allowedTopicsExists) {
          updateData.allowed_topics = allowedTopics;
        }

        result = await supabase
          .from("whatsapp_agent_settings")
          .update(updateData)
          .eq("business_id", businessId);
      } else {
        // Create new settings with defaults
        const newSettings: Record<string, any> = {
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
        };

        // Only include allowed_topics if the column exists
        if (allowedTopicsExists) {
          newSettings.allowed_topics = allowedTopics;
        }

        result = await supabase
          .from("whatsapp_agent_settings")
          .insert(newSettings);
      }

      if (result.error) {
        // If error is about allowed_topics column, retry without it
        if (
          result.error.code === "PGRST204" &&
          result.error.message?.includes("allowed_topics")
        ) {
          console.log(
            "Column allowed_topics not found. Retrying without this field."
          );

          if (existingSettings) {
            result = await supabase
              .from("whatsapp_agent_settings")
              .update({
                updated_at: new Date().toISOString(),
              })
              .eq("business_id", businessId);
          } else {
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
            });
          }

          if (result.error) {
            console.error(
              "Database operation error after retry:",
              result.error
            );
            return NextResponse.json(
              {
                error: "Failed to update agent settings",
                details: result.error.message,
              },
              { status: 500 }
            );
          }
        } else {
          console.error("Database operation error:", result.error);
          return NextResponse.json(
            {
              error: "Failed to update agent settings",
              details: result.error.message,
            },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        success: true,
        message: "Agent settings synchronized with business description",
      });
    } catch (dbError) {
      console.error("Database operation error:", dbError);
      return NextResponse.json(
        {
          error: "Failed to update agent settings",
          details:
            dbError instanceof Error
              ? dbError.message
              : "Unknown database error",
        },
        { status: 500 }
      );
    }
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
