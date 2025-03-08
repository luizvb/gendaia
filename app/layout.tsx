import type React from "react";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApiLoadingProvider } from "@/components/api-loading-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PageLoading } from "@/components/page-loading";
import { SWRProvider } from "@/components/swr-provider";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GENDAIA - AI que agenda!",
  description:
    "Plataforma elegante e minimalista para gerenciar agendamentos de serviços de GENDAIA",
  generator: "v0.dev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={inter.className}
        style={{ "--header-height": "4rem" } as React.CSSProperties}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SWRProvider>
            <ApiLoadingProvider>
              <PageLoading />
              <main className="transition-all duration-300 ease-in-out">
                <Suspense fallback={<div className="p-4">Carregando...</div>}>
                  {children}
                </Suspense>
              </main>
            </ApiLoadingProvider>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
