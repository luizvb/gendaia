import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApiLoadingProvider } from "@/components/api-loading-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PageLoading } from "@/components/page-loading";
import { SWRProvider } from "@/components/swr-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GendaIA - AI que agenda!",
  description:
    "Plataforma elegante e minimalista para gerenciar agendamentos de serviços de GendaIA",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SWRProvider>
            <ApiLoadingProvider>
              <PageLoading />
              {children}
            </ApiLoadingProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

import "./globals.css";
