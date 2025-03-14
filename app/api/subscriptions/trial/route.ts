import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(session);

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    console.log(businessId);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const { planId } = await request.json();
    const trialEndDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Create subscription record
    const { error: subscriptionError } = await supabase
      .from("subscriptions")
      .upsert({
        business_id: businessId,
        plan: planId,
        status: "trialing",
        start_date: new Date().toISOString(),
        trial_end_date: trialEndDate.toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (subscriptionError) {
      console.error("Error creating subscription:", subscriptionError);
      return NextResponse.json(
        { error: "Error creating subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error creating trial subscription:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
