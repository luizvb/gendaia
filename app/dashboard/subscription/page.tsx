"use client";

import { useState, useEffect } from "react";
import { PLAN_DATA, PlanGrid, SubscriptionSummary } from "@/components/plans";

interface Subscription {
  id: string;
  business_id: string;
  plan: string;
  status: "trialing" | "active" | "canceled" | "past_due";
  start_date: string;
  end_date: string | null;
  trial_end_date: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  email: string;
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      try {
        const response = await fetch("/api/subscriptions");
        const data = await response.json();
        setSubscription(data[0]); // Get the most recent subscription
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, []);

  // Function to get readable plan name from plan ID
  const getPlanName = (planId: string) => {
    if (!planId) return "Desconhecido";

    // First try to find a match in our local plans array
    const localPlan = PLAN_DATA.find((p) => p.id === planId);
    if (localPlan) {
      return localPlan.name;
    }

    // Fallback to just displaying the ID
    return planId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura e método de pagamento
        </p>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : subscription &&
        (subscription.status === "trialing" ||
          subscription.status === "active") ? (
        <>
          <SubscriptionSummary
            subscription={subscription}
            planName={getPlanName(subscription.plan)}
          />

          {subscription.status === "trialing" && (
            <div className="mt-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Assine já</h2>
                <p className="text-muted-foreground">
                  Escolha o plano que melhor se adapta às suas necessidades
                </p>
              </div>

              <PlanGrid plans={PLAN_DATA} />
            </div>
          )}
        </>
      ) : (
        <div>
          <div className="mt-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">
                {subscription
                  ? "Seu plano está expirado, assine agora e continue utilizando a Gendaia"
                  : "Escolha um plano para começar a usar a Gendaia"}
              </h2>
            </div>

            <PlanGrid plans={PLAN_DATA} />
          </div>
        </div>
      )}
    </div>
  );
}
