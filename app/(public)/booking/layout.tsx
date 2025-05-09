import type React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Gendaia - Agendamento Online",
  description:
    "Agende seu horário online de forma rápida e prática. Escolha o serviço, profissional, data e horário disponíveis.",
  keywords: [
    "agendamento online",
    "marcar horário",
    "reserva de serviços",
    "consulta",
    "atendimento",
    "disponibilidade",
  ],
  openGraph: {
    title: "Gendaia - Agendamento Online",
    description:
      "Agende seu horário online de forma rápida e prática. Agendamento disponível 24 horas por dia, 7 dias por semana.",
    type: "website",
  },
};

export default function BookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-semibold tracking-tight">
              GENDAIA
            </span>
          </Link>
        </div>
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="h-4 w-4" />
            Voltar para o site
          </Button>
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-6 md:py-8">
        <div className="container flex flex-col items-center justify-center gap-4 px-4 md:px-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} GENDAIA. Todos os direitos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
