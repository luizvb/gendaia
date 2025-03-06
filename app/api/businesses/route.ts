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
