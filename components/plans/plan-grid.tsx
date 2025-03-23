import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Plan } from "./types";
import { PlanCard } from "./plan-card";

interface PlanGridProps {
  plans: Plan[];
  onSuccess?: (planId: string) => void;
  returnUrl?: string;
}

export function PlanGrid({
  plans,
  onSuccess,
  returnUrl = "/dashboard/subscription",
}: PlanGridProps) {
  const router = useRouter();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  // Função para iniciar checkout com Stripe
  const startCheckout = async (planId: string) => {
    setCheckoutLoading(planId);
    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: planId,
          trial: false,
          returnUrl,
        }),
      });

      const { url, error } = await response.json();

      if (error) {
        console.error("Erro ao criar sessão de checkout:", error);
        toast.error("Erro ao criar sessão de checkout. Tente novamente.");
        return;
      }

      if (onSuccess) {
        onSuccess(planId);
      }

      // Redirecionar para o checkout do Stripe
      window.location.href = url;
    } catch (error) {
      console.error("Erro ao processar checkout:", error);
      toast.error("Erro ao processar checkout. Tente novamente.");
    } finally {
      setCheckoutLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          onSelect={startCheckout}
          loadingPlanId={checkoutLoading}
        />
      ))}
    </div>
  );
}
