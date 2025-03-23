"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OnboardingSteps } from "@/components/onboarding-steps";
import {
  PLAN_DATA,
  TRIAL_FEATURES,
  PlanGrid,
  TrialSection,
  SubscriptionProps,
} from "@/components/plans";

export default function PlanSelectionPage() {
  const router = useRouter();
  const [selectedTab, setSelectedTab] = useState<"trial" | "payment">("trial");
  const [subscription, setSubscription] = useState<SubscriptionProps | null>(
    null
  );
  const [fetchingSubscription, setFetchingSubscription] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      setFetchingSubscription(true);
      try {
        const response = await fetch("/api/subscriptions");
        const data = await response.json();
        if (data && data.length > 0) {
          setSubscription(data[0]); // Get the most recent subscription

          // If the user already has an active or trial subscription, go to the success page
          // if (data[0].status === "active" || data[0].status === "trialing") {
          //   toast.info("Você já possui um plano ativo.");
          //   router.push("/onboarding/success");
          // }
        }
      } catch (error) {
        console.error("Error fetching subscription:", error);
      } finally {
        setFetchingSubscription(false);
      }
    }

    fetchSubscription();
  }, [router]);

  const handleSuccessfulPlanSelection = () => {
    // Pode ser usado para mostrar feedback ou logar analytics
    console.log("Plano selecionado com sucesso");
  };

  if (fetchingSubscription) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <OnboardingSteps currentStep={2} />
        <Card className="mt-8">
          <CardContent className="flex items-center justify-center py-10">
            <p>Verificando assinatura...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <OnboardingSteps currentStep={2} />

      <Card className="mt-8">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Escolha como começar
          </CardTitle>
          <CardDescription>
            Comece gratuitamente ou escolha um plano pago agora.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            defaultValue="trial"
            className="w-full"
            onValueChange={(value) =>
              setSelectedTab(value as "trial" | "payment")
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="trial">Começar Grátis</TabsTrigger>
              <TabsTrigger value="payment">Pagar Agora</TabsTrigger>
            </TabsList>
            <TabsContent value="trial">
              <TrialSection
                features={TRIAL_FEATURES}
                successRedirectUrl="/onboarding/success"
                onSuccess={handleSuccessfulPlanSelection}
              />
            </TabsContent>
            <TabsContent value="payment" className="w-full">
              <PlanGrid
                plans={PLAN_DATA}
                returnUrl="/onboarding/success"
                onSuccess={handleSuccessfulPlanSelection}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/onboarding")}>
            Voltar
          </Button>
          {/* Removido o botão de trial pois agora está no componente TrialSection */}
        </CardFooter>
      </Card>
    </div>
  );
}
