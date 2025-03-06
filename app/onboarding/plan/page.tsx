"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Info } from "lucide-react";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

export default function PlanSelectionPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setIsLoading(true);

    try {
      // Simulação de seleção de plano
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Redirecionar para a próxima etapa
      router.push("/onboarding/payment");
    } catch (error) {
      console.error("Erro ao selecionar plano:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <OnboardingSteps currentStep={2} />

      <Card className="mt-8">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            Escolha seu Plano
          </CardTitle>
          <CardDescription>
            Selecione o plano que melhor atende às necessidades da sua GendaIA.
            Todos os planos incluem um período de teste gratuito de 7 dias.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 rounded-lg bg-primary/10 p-4 text-sm">
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              <p className="font-medium text-primary">
                Experimente grátis por 7 dias
              </p>
            </div>
            <p className="mt-1 text-muted-foreground">
              Todos os planos incluem um período de teste gratuito de 7 dias.
              Você não será cobrado até o final do período de teste.
            </p>
          </div>

          <RadioGroup
            value={selectedPlan}
            onValueChange={setSelectedPlan}
            className="grid gap-4 md:grid-cols-3"
          >
            {plans.map((plan) => (
              <Label
                key={plan.id}
                htmlFor={plan.id}
                className={`flex cursor-pointer flex-col rounded-lg border p-4 ${
                  selectedPlan === plan.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-muted/50"
                } ${plan.recommended ? "relative" : ""}`}
              >
                {plan.recommended && (
                  <div className="absolute -top-2 right-4 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    Recomendado
                  </div>
                )}
                <div className="flex items-start space-x-2">
                  <RadioGroupItem
                    value={plan.id}
                    id={plan.id}
                    className="mt-1"
                  />
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <h3 className="font-medium">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {plan.description}
                      </p>
                    </div>
                    <div className="text-xl font-bold">
                      {plan.price}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        /mês
                      </span>
                    </div>
                    <div className="mt-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-800 inline-block">
                      7 dias de teste grátis
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-primary">
                        7 dias grátis
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-3 w-3 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Você não será cobrado durante o período de teste
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <ul className="space-y-2 text-sm">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <Check className="mr-2 h-4 w-4 text-primary" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => router.push("/onboarding")}>
            Voltar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Processando..." : "Iniciar período de teste gratuito"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
