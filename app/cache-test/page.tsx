"use client";

import { useState, useEffect } from "react";
import { useCachedFetch } from "@/components/hooks/use-cached-fetch";

export default function CacheTestPage() {
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Usando o hook de cache para buscar dados do teste
  const {
    data: cachedData,
    isLoading,
    error,
    mutate,
  } = useCachedFetch<any>(`/api/test-simple-cache`, {
    // Cache por 30 segundos
    dedupingInterval: 30000,
  });

  // Função para testar o cache
  const testCache = async () => {
    setLoading(true);
    try {
      const start = performance.now();
      const response = await fetch("/api/test-simple-cache");
      const data = await response.json();
      const end = performance.now();

      setTestResults((prev) => [
        {
          timestamp: new Date().toISOString(),
          responseTime: Math.round(end - start),
          data,
        },
        ...prev,
      ]);
    } catch (error) {
      console.error("Erro ao testar cache:", error);
    } finally {
      setLoading(false);
    }
  };

  // Função para limpar o cache
  const clearCache = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/clear-cache");
      const data = await response.json();

      setTestResults((prev) => [
        {
          timestamp: new Date().toISOString(),
          action: "Cache limpo",
          data,
        },
        ...prev,
      ]);

      // Revalidar dados em cache
      mutate();
    } catch (error) {
      console.error("Erro ao limpar cache:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Teste de Cache</h1>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <div className="bg-card p-4 rounded-md shadow">
          <h2 className="text-xl font-semibold mb-4">Dados em Cache (SWR)</h2>
          {isLoading ? (
            <div className="animate-pulse h-20 bg-muted rounded-md"></div>
          ) : error ? (
            <div className="text-red-500">Erro ao carregar dados</div>
          ) : (
            <pre className="bg-muted p-4 rounded-md overflow-auto max-h-60">
              {JSON.stringify(cachedData, null, 2)}
            </pre>
          )}
        </div>

        <div className="bg-card p-4 rounded-md shadow">
          <h2 className="text-xl font-semibold mb-4">Ações</h2>
          <div className="flex flex-col gap-4">
            <button
              onClick={testCache}
              disabled={loading}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Carregando..." : "Testar Cache"}
            </button>

            <button
              onClick={clearCache}
              disabled={loading}
              className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90 disabled:opacity-50"
            >
              {loading ? "Carregando..." : "Limpar Cache"}
            </button>

            <button
              onClick={() => mutate()}
              disabled={loading}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90 disabled:opacity-50"
            >
              {loading ? "Carregando..." : "Revalidar Cache (SWR)"}
            </button>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-semibold mb-4">Resultados dos Testes</h2>
      <div className="bg-card rounded-md shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Timestamp
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Ação
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Tempo de Resposta
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Dados
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {testResults.length > 0 ? (
                testResults.map((result, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {result.action || "Teste de Cache"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {result.responseTime ? `${result.responseTime}ms` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <pre className="max-w-xs overflow-hidden text-ellipsis">
                        {JSON.stringify(result.data)}
                      </pre>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Nenhum teste realizado ainda.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 text-sm text-muted-foreground">
        <h3 className="font-semibold mb-2">Como funciona o cache:</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            O cache no cliente (SWR) armazena os dados em memória no navegador.
          </li>
          <li>
            O cache no servidor armazena as respostas de API em memória no
            servidor.
          </li>
          <li>O botão "Testar Cache" faz uma requisição à API de teste.</li>
          <li>O botão "Limpar Cache" limpa todo o cache no servidor.</li>
          <li>
            O botão "Revalidar Cache (SWR)" força a revalidação do cache no
            cliente.
          </li>
        </ul>
      </div>
    </div>
  );
}
