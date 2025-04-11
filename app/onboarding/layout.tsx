import type React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gendaia - Configuração Inicial",
  description:
    "Configure seu negócio na Gendaia em poucos passos. Plataforma completa para agendamentos e atendimento automatizado via WhatsApp com IA.",
  keywords: [
    "onboarding",
    "configuração",
    "agendamento",
    "setup",
    "assistente virtual",
    "integração WhatsApp",
  ],
  openGraph: {
    title: "Gendaia - Configuração Inicial",
    description:
      "Configure seu negócio na Gendaia em poucos passos. Plataforma completa para agendamentos.",
    type: "website",
  },
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-16 items-center border-b px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/placeholder.svg?height=32&width=32"
            alt="Logo"
            width={32}
            height={32}
            className="rounded-md"
          />
          <span className="text-lg font-semibold">GENDAIA</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col p-4 md:p-8">{children}</main>
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} GENDAIA. Todos os direitos reservados.
      </footer>
    </div>
  );
}
