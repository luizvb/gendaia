import { Check } from "lucide-react";

interface OnboardingStepsProps {
  currentStep: number;
}

export function OnboardingSteps({ currentStep }: OnboardingStepsProps) {
  const steps = [
    { id: 1, name: "Organização" },
    { id: 2, name: "Plano" },
    { id: 3, name: "Concluído" },
  ];

  return (
    <div className="w-full">
      <nav aria-label="Progress">
        <ol role="list" className="space-y-4 md:flex md:space-x-8 md:space-y-0">
          {steps.map((step) => (
            <li key={step.id} className="md:flex-1">
              <div
                className={`group flex flex-col border-l-4 py-2 pl-4 md:border-l-0 md:border-t-4 md:pb-0 md:pl-0 md:pt-4 ${
                  step.id < currentStep
                    ? "border-primary"
                    : step.id === currentStep
                    ? "border-primary"
                    : "border-border"
                }`}
              >
                <span
                  className={`text-sm font-medium ${
                    step.id < currentStep
                      ? "text-primary"
                      : step.id === currentStep
                      ? "text-primary"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.id < currentStep ? (
                    <span className="flex items-center">
                      <Check className="mr-2 h-4 w-4" />
                      {step.name}
                    </span>
                  ) : (
                    step.name
                  )}
                </span>
                <span
                  className={`text-sm ${
                    step.id <= currentStep
                      ? "text-muted-foreground"
                      : "text-muted-foreground/60"
                  }`}
                >
                  Passo {step.id}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
