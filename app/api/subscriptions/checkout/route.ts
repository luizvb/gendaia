import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, STRIPE_PLANS, TRIAL_PERIOD_DAYS } from "@/app/lib/stripe";
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

    // Get business and subscription info
    const { data: business } = await supabase
      .from("businesses")
      .select("id, name, stripe_customer_id, email")
      .eq("id", businessId)
      .single();

    if (!business) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Create Stripe customer if not exists
    let customerId = business.stripe_customer_id;
    if (customerId) {
      try {
        // Verify the customer exists in Stripe
        await stripe.customers.retrieve(customerId);
      } catch (error) {
        // Customer doesn't exist in Stripe, create a new one
        console.log("Customer ID invalid, creating new customer");
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.email || session.user.email,
        name: business.name,
        metadata: {
          businessId: business.id,
        },
      });

      customerId = customer.id;

      // Update business with Stripe customer ID
      await supabase
        .from("businesses")
        .update({ stripe_customer_id: customerId })
        .eq("id", businessId);
    }

    const { plan, trial = false } = await request.json();
    console.log("Price ID recebido:", plan);

    const priceId =
      STRIPE_PLANS[plan.toUpperCase() as keyof typeof STRIPE_PLANS];

    if (!priceId) {
      return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
    }

    // Check if user has had a trial before
    const { data: previousSubscriptions } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("business_id", businessId)
      .or("status.eq.active,status.eq.trialing");

    // Check if eligible for trial
    const { data: trialEligibility } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("business_id", businessId)
      .eq("status", "trialing");

    const alreadyHadTrial = trialEligibility && trialEligibility.length > 0;

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      billing_address_collection: "auto",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      client_reference_id: businessId,
      subscription_data: {
        metadata: {
          businessId,
          plan,
        },
        // Only add trial if user hasn't had one before and requested it
        trial_period_days:
          trial && !alreadyHadTrial ? TRIAL_PERIOD_DAYS : undefined,
      },
      // Allow promotion codes
      allow_promotion_codes: true,
      success_url: `${request.headers.get(
        "origin"
      )}/dashboard/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.get(
        "origin"
      )}/dashboard/subscription?canceled=true`,
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
