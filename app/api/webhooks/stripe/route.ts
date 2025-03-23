import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { stripe } from "@/app/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

export async function POST(req: Request) {
  console.log("📣 Stripe webhook received");

  const body = await req.text();
  const signature = headers().get("stripe-signature");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log(`✅ Webhook verified: ${event.type}`);
  } catch (error) {
    console.error(`❌ Webhook signature verification failed:`, error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`🔄 Processing checkout session: ${session.id}`);

        // Get client reference ID (this should be the business ID)
        const businessId = session.client_reference_id;
        console.log(`📊 Client reference ID (businessId): ${businessId}`);

        if (!businessId) {
          console.warn(`⚠️ Missing businessId in checkout session metadata`);
          break;
        }

        // Get subscription ID
        const subscriptionId = session.subscription as string;
        if (!subscriptionId) {
          console.warn(`⚠️ No subscription ID in checkout session`);
          break;
        }

        console.log(
          `🔄 Retrieving subscription data for ID: ${subscriptionId}`
        );

        // Retrieve the subscription to update its metadata
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );

        // Get pricing plan info
        const priceId = subscription.items.data[0].price.id;
        console.log(`📊 Price ID from subscription: ${priceId}`);

        // Get the price to find its lookup key
        const price = await stripe.prices.retrieve(priceId);
        console.log(`📊 Plan lookup key: ${price.id}`);

        // Update the subscription with business ID metadata
        console.log(
          `🔄 Updating subscription metadata with businessId: ${businessId}`
        );
        await stripe.subscriptions.update(subscriptionId, {
          metadata: {
            businessId: businessId,
            plan: price.id,
          },
        });

        // Update Supabase with subscription info
        const { data, error } = await supabase.from("subscriptions").upsert(
          {
            business_id: businessId,
            stripe_subscription_id: subscriptionId,
            stripe_customer_id: session.customer as string,
            plan: price.id,
            status: subscription.status,
            start_date: new Date(
              subscription.current_period_start * 1000
            ).toISOString(),
            end_date: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            trial_end_date: subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : null,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "business_id",
          }
        );

        if (error) {
          console.error(`❌ Error updating subscription in database:`, error);
          console.error(
            `Error details - code: ${error.code}, message: ${error.message}, details: ${error.details}`
          );
        } else {
          console.log(
            `✅ Subscription created and linked to business: ${businessId}`
          );
        }

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata.businessId;

        console.log(
          `🔄 Processing ${event.type} for business: ${businessId || "unknown"}`
        );

        // Skip processing if no business ID (it will be handled by checkout.session.completed)
        if (!businessId) {
          console.log(
            `⚠️ No businessId in metadata, waiting for checkout.session.completed`
          );
          break;
        }

        // Get plan from metadata or try to get it from price lookup key
        let plan = subscription.metadata.plan;
        if (!plan) {
          // Try to get from price lookup_key
          const priceId = subscription.items.data[0].price.id;
          try {
            const price = await stripe.prices.retrieve(priceId);
            plan = price.id;
          } catch (error) {
            console.error(`❌ Error retrieving price info: ${error}`);
            plan = "unknown";
          }
        }

        console.log(`📊 Subscription data: 
          - ID: ${subscription.id}
          - Status: ${subscription.status}
          - Plan: ${plan}
          - Current period: ${new Date(
            subscription.current_period_start * 1000
          ).toISOString()} to ${new Date(
          subscription.current_period_end * 1000
        ).toISOString()}
          - Trial end: ${
            subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : "N/A"
          }`);

        // Verificar primeiro se já existe uma assinatura para este negócio
        const { data: existingSubscription } = await supabase
          .from("subscriptions")
          .select("id, stripe_subscription_id")
          .eq("business_id", businessId)
          .maybeSingle();

        if (existingSubscription) {
          console.log(
            `ℹ️ Subscription already exists for business ${businessId}, updating...`
          );
        }

        await supabase
          .from("subscriptions")
          .upsert(
            {
              business_id: businessId,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: subscription.customer as string,
              plan: plan,
              status: subscription.status,
              start_date: new Date(
                subscription.current_period_start * 1000
              ).toISOString(),
              end_date: new Date(
                subscription.current_period_end * 1000
              ).toISOString(),
              trial_end_date: subscription.trial_end
                ? new Date(subscription.trial_end * 1000).toISOString()
                : null,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "business_id",
            }
          )
          .then(({ data, error }) => {
            if (error) {
              console.error(
                `❌ Error updating subscription in database:`,
                error
              );
              console.error(
                `Error details - code: ${error.code}, message: ${error.message}, details: ${error.details}`
              );
            } else {
              console.log(
                `✅ Updated subscription in database for business: ${businessId}`
              );
            }
          });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata.businessId;

        console.log(
          `🗑️ Processing subscription deletion for business: ${businessId}`
        );
        console.log(`📊 Subscription data: 
          - ID: ${subscription.id}
          - End date: ${new Date(
            subscription.current_period_end * 1000
          ).toISOString()}`);

        await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            end_date: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)
          .eq("business_id", businessId)
          .then(({ data, error }) => {
            if (error) {
              console.error(
                `❌ Error canceling subscription in database:`,
                error
              );
              console.error(
                `Error details - code: ${error.code}, message: ${error.message}, details: ${error.details}`
              );
            } else {
              console.log(
                `✅ Marked subscription as canceled in database for business: ${businessId}`
              );
            }
          });

        break;
      }

      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        const businessId = subscription.metadata.businessId;

        console.log(`⚠️ Trial ending soon for business: ${businessId}`);
        console.log(
          `📊 Trial ends at: ${
            subscription.trial_end
              ? new Date(subscription.trial_end * 1000).toISOString()
              : "N/A"
          }`
        );

        // You could trigger an email notification here
        // await sendTrialEndingEmail(businessId);

        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        console.log(`❌ Payment failed for subscription: ${subscriptionId}`);
        console.log(`📊 Invoice data: 
          - ID: ${invoice.id}
          - Amount: ${
            invoice.amount_due / 100
          } ${invoice.currency.toUpperCase()}
          - Customer: ${invoice.customer}`);

        // Get the subscription to find the business ID
        const subscription = await stripe.subscriptions.retrieve(
          subscriptionId
        );
        const businessId = subscription.metadata.businessId;

        console.log(
          `🔄 Updating subscription status to past_due for business: ${businessId}`
        );

        // Update subscription status to past_due
        await supabase
          .from("subscriptions")
          .update({
            status: "past_due",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscriptionId)
          .eq("business_id", businessId)
          .then(({ data, error }) => {
            if (error) {
              console.error(
                `❌ Error updating subscription status to past_due:`,
                error
              );
              console.error(
                `Error details - code: ${error.code}, message: ${error.message}, details: ${error.details}`
              );
            } else {
              console.log(
                `✅ Updated subscription status in database for business: ${businessId}`
              );
            }
          });

        // You could trigger an email notification here
        // await sendPaymentFailedEmail(businessId);

        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          console.log(
            `💰 Payment succeeded for subscription: ${subscriptionId}`
          );
          console.log(`📊 Invoice data: 
            - ID: ${invoice.id}
            - Amount: ${
              invoice.amount_paid / 100
            } ${invoice.currency.toUpperCase()}
            - Customer: ${invoice.customer}`);

          // Get the subscription to find the business ID
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          const businessId = subscription.metadata.businessId;

          console.log(
            `🔄 Ensuring subscription is marked as active for business: ${businessId}`
          );

          // Make sure subscription is marked as active
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId)
            .eq("business_id", businessId)
            .then(({ data, error }) => {
              if (error) {
                console.error(
                  `❌ Error updating subscription status to active:`,
                  error
                );
                console.error(
                  `Error details - code: ${error.code}, message: ${error.message}, details: ${error.details}`
                );
              } else {
                console.log(
                  `✅ Updated subscription status in database for business: ${businessId}`
                );
              }
            });
        } else {
          console.log(
            `ℹ️ Invoice paid event without subscription ID: ${invoice.id}`
          );
        }

        break;
      }

      default: {
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
      }
    }

    console.log(`✅ Webhook processed successfully: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`❌ Error processing webhook (${event.type}):`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
