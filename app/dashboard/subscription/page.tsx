"use client";

import { useState } from "react";
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

export default function SubscriptionPage() {
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [activeTab, setActiveTab] = useState("plan");

  // Calcular a data de término do período de teste (7 dias a partir de hoje)
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  const formattedTrialEndDate = trialEndDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assinatura</h1>
        <p className="text-muted-foreground">
          Gerencie sua assinatura e método de pagamento
        </p>
      </div>

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
            <span className="font-medium">{formattedTrialEndDate}</span>. Após
            esse período, você será cobrado automaticamente pelo plano
            selecionado.
          </p>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm">
            Cancelar Teste
          </Button>
        </CardFooter>
      </Card>

      <Tabs defaultValue="plan" onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="plan">Plano</TabsTrigger>
          <TabsTrigger value="billing">Faturamento</TabsTrigger>
        </TabsList>
        <TabsContent value="plan" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Plano Atual</CardTitle>
              <CardDescription>
                Você está atualmente no plano Professional com 7 dias de teste
                gratuito
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Professional</h3>
                    <p className="text-sm text-muted-foreground">
                      Para barbearias em crescimento
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold">
                      R$ 99,90
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        /mês
                      </span>
                    </p>
                    <p className="text-sm text-green-600 font-medium">
                      Período de teste: 5 dias restantes
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Próxima cobrança em 15/04/2023
                    </p>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="grid gap-2">
                  {plans[1].features.map((feature, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="mr-2 h-4 w-4 text-primary" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alterar Plano</CardTitle>
              <CardDescription>
                Escolha o plano que melhor atende às necessidades da sua GENDAIA
              </CardDescription>
            </CardHeader>
            <CardContent>
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
            <CardFooter>
              <Button>Atualizar Plano</Button>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="billing" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Método de Pagamento</CardTitle>
              <CardDescription>
                Gerencie seu método de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Cartão de Crédito</p>
                      <p className="text-sm text-muted-foreground">
                        Visa terminando em 4242
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Alterar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de Faturamento</CardTitle>
              <CardDescription>
                Visualize seu histórico de pagamentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Você está no período de teste gratuito. Seu primeiro pagamento
                  será em {formattedTrialEndDate}.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
