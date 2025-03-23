export * from "./types";
export * from "./plan-card";
export * from "./plan-grid";
export * from "./trial-section";
export * from "./subscription-summary";

export const PLAN_DATA = [
  {
    id: "basic",
    name: "Starter",
    price: "R$ 49,90",
    description: "Ideal para pequenos negócios",
    features: [
      "Até 1 profissional",
      "Agendamento online",
      "Gerenciamento de clientes",
      "Relatórios básicos",
      "IA para agendamentos",
    ],
  },
  {
    id: "pro",
    name: "Professional",
    price: "R$ 99,90",
    description: "Para barbearias em crescimento",
    features: [
      "Até 5 profissionais",
      "Agendamento online",
      "Gerenciamento de clientes",
      "Relatórios avançados",
      "IA para agendamentos",
      "Notificações automáticas",
    ],
    recommended: true,
  },
  {
    id: "enterprise",
    name: "Business",
    price: "R$ 199,90",
    description: "Para redes de barbearias",
    features: [
      "Profissionais ilimitados",
      "Agendamento online",
      "Gerenciamento de clientes",
      "Relatórios avançados",
      "IA avançada",
      "Notificações automáticas",
      "CRM ativo",
    ],
  },
];

export const TRIAL_FEATURES = [
  "Profissionais ilimitados",
  "Múltiplas unidades",
  "Agendamento online",
  "Gerenciamento de clientes",
  "Relatórios avançados",
  "Lembretes por SMS e Email",
  "Personalização completa",
  "API para integração",
];
