import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PostgrestError } from "@supabase/supabase-js";
import { stripe } from "@/app/lib/stripe";
import { TRIAL_PERIOD_DAYS } from "@/app/lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // First check if user already has a business
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("user_id", user.id)
      .single();

    if (existingProfile?.business_id) {
      return NextResponse.json(
        { error: "User already has a business" },
        { status: 400 }
      );
    }

    const businessData = await request.json();

    // Start a transaction first, without stripe_customer_id
    const { data: business, error: businessError } = await supabase.rpc(
      "create_business_with_profile",
      {
        business_data: businessData,
        p_user_id: user.id,
      }
    );

    if (businessError) {
      console.error("Business creation error:", businessError);
      throw businessError;
    }

    // Create Stripe customer after business creation
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: {
        user_id: user.id,
        business_id: business.id, // Add business_id to metadata
      },
    });

    // Update business with stripe_customer_id
    const { error: updateError } = await supabase
      .from("businesses")
      .update({ stripe_customer_id: customer.id })
      .eq("id", business.id);

    if (updateError) {
      console.error("Error updating stripe_customer_id:", updateError);
      throw updateError;
    }

    // Create initial subscription record with trial period
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + TRIAL_PERIOD_DAYS);

    await supabase.from("subscriptions").insert({
      business_id: business.id,
      stripe_customer_id: customer.id,
      status: "trialing",
      start_date: new Date().toISOString(),
      trial_end_date: trialEndDate.toISOString(),
    });

    // Create Vercel subdomain
    try {
      const businessName = businessData.name.toLowerCase().replace(/\s+/g, "-");
      const subdomain = `${businessName}.gendaia.com.br`;

      // Call Vercel API to create subdomain
      const vercelResponse = await fetch(
        "https://api.vercel.com/v10/projects/gendaia/domains",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: subdomain,
          }),
        }
      );

      if (!vercelResponse.ok) {
        console.error(
          "Failed to create Vercel subdomain:",
          await vercelResponse.text()
        );
      }

      // Store the subdomain in the business record
      await supabase
        .from("businesses")
        .update({ subdomain })
        .eq("id", business.id);

      // Add subdomain to the response
      business.subdomain = subdomain;
    } catch (error) {
      console.error("Error creating subdomain:", error);
      // Continue even if subdomain creation fails
    }

    // Initialize AI agent settings
    try {
      // Default allowed topics
      const defaultTopics = "agendamento de serviços";

      // Always include the business description if it exists
      let allowedTopics = defaultTopics;
      if (businessData.description) {
        allowedTopics = `${defaultTopics}, ${businessData.description}`;
      }

      await supabase.from("whatsapp_agent_settings").insert({
        business_id: business.id,
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
    } catch (error) {
      console.error("Error initializing AI agent settings:", error);
      // Continue even if agent settings initialization fails
    }

    return NextResponse.json(business, { status: 201 });
  } catch (error) {
    console.error("Error creating business:", error);
    if (error instanceof PostgrestError) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
