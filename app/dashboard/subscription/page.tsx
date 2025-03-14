"use client";

import { useState, useEffect, useRef } from "react";
import { Check, CreditCard, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "stripe-pricing-table": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "pricing-table-id": string;
          "publishable-key": string;
          "client-reference-id"?: string;
          "customer-email"?: string;
          appearance?: string;
        },
        HTMLElement
      >;
    }
  }
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: "R$ 49,90",
    description: "Ideal para barbearias pequenas",
    features: [
      "Até 2 profissionais",
      "Agendamento online",
      "Gerenciamento de clientes",
      "Relatórios básicos",
    ],
  },
  {
    id: "professional",
    name: "Professional",
    price: "R$ 99,90",
    description: "Para barbearias em crescimento",
    features: [
      "Até 5 profissionais",
      "Agendamento online",
      "Gerenciamento de clientes",
      "Relatórios avançados",
      "Lembretes por SMS",
      "Personalização da agenda",
    ],
    recommended: true,
  },
  {
    id: "business",
    name: "Business",
    price: "R$ 199,90",
    description: "Para redes de barbearias",
    features: [
      "Profissionais ilimitados",
      "Múltiplas unidades",
      "Agendamento online",
      "Gerenciamento de clientes",
      "Relatórios avançados",
      "Lembretes por SMS e Email",
      "Personalização completa",
      "API para integração",
    ],
  },
];

const StripePricingTable = ({
  businessId,
  email,
}: {
  businessId: string;
  email: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if script already exists
    const existingScript = document.querySelector(
      'script[src="https://js.stripe.com/v3/pricing-table.js"]'
    );

    if (!existingScript) {
      // Add script to head only if it doesn't exist
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/pricing-table.js";
      script.async = true;
      script.onload = () => {
        if (containerRef.current) {
          const table = document.createElement("stripe-pricing-table");
          table.setAttribute(
            "pricing-table-id",
            "prctbl_1R2Mu7KD7xVMZWERMkMCALzA"
          );
          table.setAttribute(
            "publishable-key",
            "pk_test_51QunOZKD7xVMZWERWzwJ173Y6r5oFhexgoflL4m6npRQoS9ogiw5ivuA9Pl6BmeEpMneHojRcPvX7M8zWPBkMiwD00Kflba83I"
          );
          table.setAttribute("client-reference-id", businessId);
          table.setAttribute("customer-email", email);
          table.setAttribute("appearance", "dark");
          containerRef.current.appendChild(table);
        }
      };
      document.head.appendChild(script);
    } else {
      // If script already exists, create table immediately
      if (containerRef.current) {
        const table = document.createElement("stripe-pricing-table");
        table.setAttribute(
          "pricing-table-id",
          "prctbl_1R2Mu7KD7xVMZWERMkMCALzA"
        );
        table.setAttribute(
          "publishable-key",
          "pk_test_51QunOZKD7xVMZWERWzwJ173Y6r5oFhexgoflL4m6npRQoS9ogiw5ivuA9Pl6BmeEpMneHojRcPvX7M8zWPBkMiwD00Kflba83I"
        );
        table.setAttribute("client-reference-id", businessId);
        table.setAttribute("customer-email", email);
        table.setAttribute("appearance", "dark");
        containerRef.current.appendChild(table);
      }
    }

    return () => {
      // Cleanup table on unmount
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [businessId, email]);

  return <div ref={containerRef} className="stripe-pricing-table" />;
};

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [activeTab, setActiveTab] = useState("plan");
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  // Calculate days remaining in trial if in trial period
  const getDaysRemaining = () => {
    if (!subscription?.trial_end_date) return 0;
    const trialEnd = new Date(subscription.trial_end_date);
    const now = new Date();
    const diffTime = trialEnd.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const daysRemaining = getDaysRemaining();
  const isTrialActive =
    subscription?.status === "trialing" && daysRemaining > 0;

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

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("pt-BR");
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
      ) : isTrialActive && subscription ? (
        <>
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Período de Teste Gratuito
              </CardTitle>
              <CardDescription>
                Você está atualmente no período de teste gratuito do plano
                Professional
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Seu período de teste termina em{" "}
                <span className="font-medium">
                  {formatDate(subscription.trial_end_date)}
                </span>
                . Após esse período, você será cobrado automaticamente pelo
                plano selecionado.
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  try {
                    await fetch("/api/subscriptions/cancel", {
                      method: "POST",
                    });
                    window.location.reload();
                  } catch (error) {
                    console.error("Error canceling trial:", error);
                  }
                }}
              >
                Cancelar Teste
              </Button>
            </CardFooter>
          </Card>

          {/* Stripe Pricing Table for trial users */}
          <div className="mt-8">
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-2">Assine já</h2>
            </div>
            {subscription && (
              <div className="w-full max-w-6xl mx-auto">
                <StripePricingTable
                  businessId={subscription.business_id}
                  email={subscription.email}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        <div>
          {/* Stripe Pricing Table for trial users */}
          <div className="mt-8">
            <div className="mb-8">
              Seu plano está expirado, assine agora e continue utilizando a
              Gendaia
            </div>
            {subscription && (
              <div className="w-full max-w-6xl mx-auto">
                <StripePricingTable
                  businessId={subscription.business_id}
                  email={subscription.email}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
