import { NextRequest, NextResponse } from "next/server";
import { createSimpleCachedHandler } from "@/lib/simple-cache";

// Handler simples para teste
async function testHandler(request: NextRequest) {
  console.log(
    "Executando testHandler simples - sem cache isso aparecerá a cada requisição"
  );

  // Simulando um atraso para testar o cache
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Retornando a data e hora atual para verificar se está em cache
  return NextResponse.json({
    message: "Teste de cache simples",
    timestamp: new Date().toISOString(),
    cached: true,
  });
}

// Aplicando cache simples ao handler de teste
export const GET = createSimpleCachedHandler(testHandler, {
  // Cache por 30 segundos para facilitar o teste
  ttl: 30,
  // Chave de cache simples
  getCacheKey: () => "test-simple-cache-key",
});

// Adicionar esta configuração para evitar que o middleware exija autenticação
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
