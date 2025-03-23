import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TrialSectionProps {
  features: string[];
  onSuccess?: () => void;
  successRedirectUrl?: string;
  planId?: string;
}

export function TrialSection({
  features,
  onSuccess,
  successRedirectUrl = "/onboarding/success",
  planId = "business",
}: TrialSectionProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleStartTrial = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/subscriptions/trial", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          planId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao criar assinatura de teste");
      }

      toast.success("Período de teste iniciado com sucesso!");

      if (onSuccess) {
        onSuccess();
      }

      router.push(successRedirectUrl);
    } catch (error) {
      console.error("Erro ao iniciar trial:", error);
      toast.error("Erro ao iniciar período de teste. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-primary bg-primary/5 p-6">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-primary" />
        <h3 className="font-medium text-primary">
          7 dias grátis com acesso completo
        </h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">
        Experimente todas as funcionalidades da plataforma gratuitamente por 7
        dias. Você não será cobrado durante o período de teste e pode cancelar a
        qualquer momento.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {features.map((feature, index) => (
          <div key={index} className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary" />
            <span className="text-sm">{feature}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 rounded-lg bg-background p-4">
        <p className="text-sm font-medium">O que acontece depois dos 7 dias?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Após o período de teste, você poderá escolher o plano que melhor
          atende às suas necessidades. Não se preocupe, enviaremos um lembrete
          antes do fim do período de teste.
        </p>
      </div>
      <div className="mt-6">
        <Button
          onClick={handleStartTrial}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? "Processando..." : "Começar período gratuito"}
        </Button>
      </div>
    </div>
  );
}
