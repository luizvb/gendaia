"use client";

import { useRouter } from "next/navigation";
import { CheckCircle, Calendar } from "lucide-react";

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

export default function SuccessPage() {
  const router = useRouter();

  // Calcular a data de término do período de teste (7 dias a partir de hoje)
  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  const formattedTrialEndDate = trialEndDate.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <OnboardingSteps currentStep={4} />

      <Card className="mt-8">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            Configuração Concluída!
          </CardTitle>
          <CardDescription>
            Sua GendaIA foi configurada com sucesso. Você já pode começar a usar
            a plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="rounded-lg border bg-primary/5 p-4">
            <div className="flex items-center justify-center gap-2 text-primary">
              <Calendar className="h-5 w-5" />
              <h3 className="font-medium">
                Seu período de teste gratuito termina em {formattedTrialEndDate}
              </h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Aproveite todos os recursos da plataforma durante os próximos 7
              dias sem nenhum custo. Você pode cancelar a qualquer momento
              durante o período de teste.
            </p>
          </div>

          <div className="rounded-lg border bg-muted p-4">
            <h3 className="mb-2 font-medium">Próximos Passos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Adicione seus serviços</li>
              <li>Configure seus profissionais</li>
              <li>Personalize seus horários de funcionamento</li>
              <li>Comece a receber agendamentos</li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push("/dashboard")} className="px-8">
            Ir para o Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
