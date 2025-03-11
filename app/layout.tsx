import type React from "react";
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ApiLoadingProvider } from "@/components/api-loading-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { PageLoading } from "@/components/page-loading";
import { SWRProvider } from "@/components/swr-provider";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gendaia - AI que agenda!",
  description:
    "Plataforma elegante e minimalista para gerenciar agendamentos de serviços com Inteligência Artificial",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GENDAIA",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/images/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta
          name="apple-mobile-web-app-status-bar-style"
          content="black-translucent"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('Service Worker registrado com sucesso:', registration.scope);
                    },
                    function(err) {
                      console.log('Falha ao registrar Service Worker:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
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
