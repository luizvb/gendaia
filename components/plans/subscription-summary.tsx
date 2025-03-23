import { useState } from "react";
import { toast } from "sonner";
import { CreditCard, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SubscriptionProps } from "./types";

interface SubscriptionSummaryProps {
  subscription: SubscriptionProps;
  planName: string;
  onCancelSuccess?: () => void;
  onManageSuccess?: () => void;
}

export function SubscriptionSummary({
  subscription,
  planName,
  onCancelSuccess,
  onManageSuccess,
}: SubscriptionSummaryProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  // Calcular dias restantes do período de trial
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

  // Função para abrir o portal do cliente Stripe
  const openCustomerPortal = async () => {
    setIsRedirecting(true);
    try {
      const response = await fetch("/api/subscriptions/portal", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      });

      const { url } = await response.json();

      if (onManageSuccess) {
        onManageSuccess();
      }

      window.location.href = url;
    } catch (error) {
      console.error("Error opening customer portal:", error);
      toast.error("Erro ao abrir o portal do cliente. Tente novamente.");
      setIsRedirecting(false);
    }
  };

  // Função para cancelar assinatura
  const cancelSubscription = async () => {
    setIsCanceling(true);
    try {
      const response = await fetch("/api/subscriptions/cancel", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Erro ao cancelar assinatura");
      }

      toast.success("Assinatura cancelada com sucesso");

      if (onCancelSuccess) {
        onCancelSuccess();
      } else {
        window.location.reload();
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("Erro ao cancelar assinatura. Tente novamente.");
    } finally {
      setIsCanceling(false);
    }
  };

  if (isTrialActive) {
    return (
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Período de Teste Gratuito
          </CardTitle>
          <CardDescription>
            Você está atualmente no período de teste gratuito do plano{" "}
            {planName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Seu período de teste termina em{" "}
            <span className="font-medium">
              {formatDate(subscription.trial_end_date)}
            </span>
            . Assine um plano para continuar utilizando a Gendaia
          </p>
        </CardContent>
        <CardFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={cancelSubscription}
            disabled={isCanceling}
          >
            {isCanceling ? "Processando..." : "Cancelar Teste"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (subscription?.status === "active") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Plano {planName}
          </CardTitle>
          <CardDescription>Sua assinatura está ativa</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            Assinatura válida até {formatDate(subscription.end_date)}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={cancelSubscription}
            disabled={isCanceling}
          >
            {isCanceling ? "Processando..." : "Cancelar Assinatura"}
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={openCustomerPortal}
            disabled={isRedirecting}
          >
            {isRedirecting ? "Redirecionando..." : "Gerenciar Assinatura"}
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return null;
}
