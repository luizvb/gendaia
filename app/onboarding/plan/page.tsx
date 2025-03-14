"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { Info, Check } from "lucide-react";
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

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "stripe-pricing-table": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          "pricing-table-id": string;
          "publishable-key": string;
        },
        HTMLElement
      >;
    }
  }
}

const trialFeatures = [
  "Profissionais ilimitados",
  "Múltiplas unidades",
  "Agendamento online",
  "Gerenciamento de clientes",
  "Relatórios avançados",
  "Lembretes por SMS e Email",
  "Personalização completa",
  "API para integração",
];

export default function PlanSelectionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"trial" | "payment">("trial");

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/subscriptions/trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId: "business",
        }),
      });

      console.log(response);

      const data = await response.json();
      console.log(data);

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar assinatura");
      }

      toast.success("Período de teste iniciado com sucesso!");
      router.push("/onboarding/success");
    } catch (error) {
      console.error("Erro ao iniciar trial:", error);
      toast.error("Erro ao iniciar período de teste. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Script async src="https://js.stripe.com/v3/pricing-table.js" />
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
                <div className="rounded-lg border border-primary bg-primary/5 p-6">
                  <div className="flex items-center gap-2">
                    <Info className="h-5 w-5 text-primary" />
                    <h3 className="font-medium text-primary">
                      7 dias grátis com acesso completo
                    </h3>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Experimente todas as funcionalidades da plataforma
                    gratuitamente por 7 dias. Você não será cobrado durante o
                    período de teste e pode cancelar a qualquer momento.
                  </p>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    {trialFeatures.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary" />
                        <span className="text-sm">{feature}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 rounded-lg bg-background p-4">
                    <p className="text-sm font-medium">
                      O que acontece depois dos 7 dias?
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Após o período de teste, você poderá escolher o plano que
                      melhor atende às suas necessidades. Não se preocupe,
                      enviaremos um lembrete antes do fim do período de teste.
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="payment" className="w-full">
                <stripe-pricing-table
                  pricing-table-id="prctbl_1R2Mu7KD7xVMZWERMkMCALzA"
                  publishable-key="pk_test_51QunOZKD7xVMZWERWzwJ173Y6r5oFhexgoflL4m6npRQoS9ogiw5ivuA9Pl6BmeEpMneHojRcPvX7M8zWPBkMiwD00Kflba83I"
                ></stripe-pricing-table>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push("/onboarding")}
            >
              Voltar
            </Button>
            {selectedTab === "trial" && (
              <Button onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? "Processando..." : "Começar período gratuito"}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
