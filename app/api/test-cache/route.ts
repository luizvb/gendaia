import { NextRequest, NextResponse } from "next/server";
import { createCachedGetHandler } from "@/lib/api-cache";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

// Handler simples para teste
async function testHandler(request: NextRequest) {
  console.log(
    "Executando testHandler - sem cache isso aparecerá a cada requisição"
  );

  // Simulando um atraso para testar o cache
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Retornando a data e hora atual para verificar se está em cache
  return NextResponse.json({
    message: "Teste de cache",
    timestamp: new Date().toISOString(),
    cached: true,
  });
}

// Aplicando cache ao handler de teste
export const GET = createCachedGetHandler(testHandler, "dashboard", {
  // Cache por 30 segundos para facilitar o teste
  revalidate: 30,
  // Chave de cache simples
  getCacheKey: () => ["test-cache-key"],
});
