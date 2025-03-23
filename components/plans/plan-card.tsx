import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Plan } from "./types";

interface PlanCardProps {
  plan: Plan;
  onSelect: (planId: string) => void;
  isLoading?: boolean;
  loadingPlanId?: string | null;
}

export function PlanCard({
  plan,
  onSelect,
  isLoading,
  loadingPlanId,
}: PlanCardProps) {
  const isCurrentPlanLoading = loadingPlanId === plan.id;

  return (
    <Card
      className={`flex flex-col ${
        plan.recommended ? "border-primary shadow-lg" : ""
      }`}
    >
      <CardHeader>
        <CardTitle>{plan.name}</CardTitle>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="text-3xl font-bold mb-4">{plan.price}</div>
        <ul className="space-y-2">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <Check className="h-5 w-5 text-primary mr-2 flex-shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          variant={plan.recommended ? "default" : "outline"}
          onClick={() => onSelect(plan.id)}
          disabled={isLoading || isCurrentPlanLoading}
        >
          {isCurrentPlanLoading ? "Processando..." : "Escolher Plano"}
        </Button>
      </CardFooter>
    </Card>
  );
}
