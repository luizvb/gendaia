import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/app/lib/stripe";
import { getBusinessId } from "@/lib/business-id";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Get subscription info
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("business_id", businessId)
      .single();

    // if (!subscription?.stripe_subscription_id) {
    //   return NextResponse.json(
    //     { error: "No active subscription found" },
    //     { status: 400 }
    //   );
    // }

    // // Cancel subscription at period end
    // await stripe.subscriptions.update(subscription.stripe_subscription_id, {
    //   cancel_at_period_end: true,
    // });

    // Update subscription status
    const { data: updatedSubscription } = await supabase
      .from("subscriptions")
      .update({
        status: "canceled",
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId)
      .select()
      .single();

    return NextResponse.json(updatedSubscription);
  } catch (error) {
    console.error("Error canceling subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
