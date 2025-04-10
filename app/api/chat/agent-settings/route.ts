import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the authenticated user (more secure than getSession)
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // Get the user's business ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", userId)
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
      console.error("Settings error:", settingsError);
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

    // Prepare the response object
    const response: Record<string, any> = {
      enabled: settings.enabled,
      name: settings.name,
      personality: settings.personality,
      description: settings.description,
      data_collection: settings.data_collection,
      auto_booking: settings.auto_booking,
      delay_response: settings.delay_response,
      allowed_topics: settings.allowed_topics || "agendamento de serviços", // Fallback in case column doesn't exist yet
    };

    // Only include topic_restriction if it exists in the settings
    if ("topic_restriction" in settings) {
      response.topic_restriction = settings.topic_restriction;
    } else {
      response.topic_restriction = true; // Default value
    }

    // Return the settings
    return NextResponse.json(response);
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

    // Get the authenticated user (more secure than getSession)
    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = userData.user.id;

    // Get the user's business ID
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", userId)
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

    if (enabled !== undefined && typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "enabled must be a boolean" },
        { status: 400 }
      );
    }

    // Prepare update data with only the fields that are provided
    const updateData: Record<string, any> = {};
    if (enabled !== undefined) updateData.enabled = enabled;
    if (name !== undefined) updateData.name = name;
    if (personality !== undefined) updateData.personality = personality;
    if (description !== undefined) updateData.description = description;
    if (data_collection !== undefined)
      updateData.data_collection = data_collection;
    if (auto_booking !== undefined) updateData.auto_booking = auto_booking;
    if (delay_response !== undefined)
      updateData.delay_response = delay_response;

    // Check if topic_restriction exists before using it
    try {
      if (topic_restriction !== undefined) {
        // Check if the column exists by making a query for it
        const { error: columnCheckError } = await supabase
          .from("whatsapp_agent_settings")
          .select("topic_restriction")
          .limit(1);

        // If no error, column exists and we can include it
        if (!columnCheckError) {
          updateData.topic_restriction = topic_restriction;
        } else {
          console.log(
            "topic_restriction column not available, skipping update for this field"
          );
        }
      }
    } catch (columnError) {
      console.log("Error checking topic_restriction column:", columnError);
      // Continue without including topic_restriction in the update
    }

    // Always update the timestamp
    updateData.updated_at = new Date().toISOString();

    // Check if settings already exist for this business
    const { data: existingSettings, error: settingsError } = await supabase
      .from("whatsapp_agent_settings")
      .select("id")
      .eq("business_id", businessId);

    if (settingsError) {
      console.error("Error checking existing settings:", settingsError);
      return NextResponse.json(
        { error: "Failed to check existing settings" },
        { status: 500 }
      );
    }

    // Handle allowed_topics separately to avoid column not found errors
    // Only include it in the update if the column exists and the value is provided
    try {
      if (allowed_topics !== undefined) {
        // Check if the column exists by making a query for it
        const { error: columnCheckError } = await supabase
          .from("whatsapp_agent_settings")
          .select("allowed_topics")
          .limit(1);

        // If no error, column exists and we can include it
        if (!columnCheckError) {
          updateData.allowed_topics = allowed_topics;
        } else {
          console.log(
            "allowed_topics column not available, skipping update for this field"
          );
        }
      }
    } catch (columnError) {
      console.log("Error checking allowed_topics column:", columnError);
      // Continue without including allowed_topics in the update
    }

    let result;

    if (existingSettings && existingSettings.length > 0) {
      // Update existing settings
      result = await supabase
        .from("whatsapp_agent_settings")
        .update(updateData)
        .eq("business_id", businessId);
    } else {
      // Insert new settings - need to include required fields
      const newSettings = {
        business_id: businessId,
        enabled: enabled ?? false,
        name: name ?? "Luiza",
        personality: personality ?? "professional",
        description:
          description ??
          "Sou especialista em agendamento de serviços. Posso ajudar com dúvidas sobre serviços, profissionais e disponibilidade de horários.",
        data_collection: data_collection ?? true,
        auto_booking: auto_booking ?? false,
        delay_response: delay_response ?? true,
        // Removed topic_restriction field as it might not exist
        // Only include allowed_topics if it's provided in the request
        ...(allowed_topics !== undefined ? { allowed_topics } : {}),
        ...updateData,
      };

      result = await supabase
        .from("whatsapp_agent_settings")
        .insert(newSettings);
    }

    if (result.error) {
      // Check for column not found error
      if (
        result.error.code === "PGRST204" &&
        result.error.message?.includes("allowed_topics")
      ) {
        console.log(
          "Column allowed_topics not found. Retrying without this field."
        );

        // Remove allowed_topics from updateData and retry
        delete updateData.allowed_topics;

        if (existingSettings && existingSettings.length > 0) {
          result = await supabase
            .from("whatsapp_agent_settings")
            .update(updateData)
            .eq("business_id", businessId);
        } else {
          const newSettings = {
            business_id: businessId,
            enabled: enabled ?? false,
            name: name ?? "Luiza",
            personality: personality ?? "professional",
            description:
              description ??
              "Sou especialista em agendamento de serviços. Posso ajudar com dúvidas sobre serviços, profissionais e disponibilidade de horários.",
            data_collection: data_collection ?? true,
            auto_booking: auto_booking ?? false,
            delay_response: delay_response ?? true,
            // Removed topic_restriction field as it might not exist
            ...updateData,
          };

          result = await supabase
            .from("whatsapp_agent_settings")
            .insert(newSettings);
        }

        if (result.error) {
          console.error("Error saving settings after retry:", result.error);
          return NextResponse.json(
            {
              error: "Failed to save agent settings",
              details: result.error.message,
            },
            { status: 500 }
          );
        }
      } else {
        console.error("Error saving settings:", result.error);
        return NextResponse.json(
          {
            error: "Failed to save agent settings",
            details: result.error.message,
          },
          { status: 500 }
        );
      }
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
