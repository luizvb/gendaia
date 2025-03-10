import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PostgrestError } from "@supabase/supabase-js";

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

    // Start a transaction
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
