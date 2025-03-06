import { NextRequest, NextResponse } from "next/server";

// Cache em memória simples
const memoryCache = new Map<
  string,
  {
    data: any;
    expiry: number;
  }
>();

/**
 * Limpa o cache expirado
 */
function cleanupCache() {
  const now = Date.now();
  for (const [key, value] of memoryCache.entries()) {
    if (value.expiry < now) {
      memoryCache.delete(key);
    }
  }
}

// Limpar o cache a cada minuto
setInterval(cleanupCache, 60000);

/**
 * Cria um handler de API com cache em memória simples
 *
 * @param handler Função handler da rota
 * @param options Opções de cache
 * @returns Handler com cache
 */
export function createSimpleCachedHandler<
  T extends (req: NextRequest) => Promise<NextResponse>
>(
  handler: T,
  options: {
    ttl?: number; // Tempo de vida em segundos
    getCacheKey?: (request: NextRequest) => string;
  } = {}
): T {
  const ttl = options.ttl ?? 300; // 5 minutos por padrão

  return (async (request: NextRequest) => {
    try {
      // Gerar chave de cache
      const cacheKey = options.getCacheKey
        ? options.getCacheKey(request)
        : `${request.method}-${request.url}`;

      // Verificar se existe no cache
      const cached = memoryCache.get(cacheKey);
      const now = Date.now();

      if (cached && cached.expiry > now) {
        console.log(`[SimpleCacheHit] ${cacheKey}`);
        return NextResponse.json(cached.data);
      }

      // Executar handler original
      console.log(`[SimpleCacheMiss] ${cacheKey}`);
      const response = await handler(request);

      // Verificar se a resposta é JSON
      const responseData = await response.clone().json();

      // Armazenar no cache
      memoryCache.set(cacheKey, {
        data: responseData,
        expiry: now + ttl * 1000,
      });

      return response;
    } catch (error) {
      console.error("Error in simple cached handler:", error);
      // Em caso de erro, executar o handler original sem cache
      return handler(request);
    }
  }) as T;
}

/**
 * Invalida uma chave de cache específica
 *
 * @param key Chave de cache a ser invalidada
 */
export function invalidateSimpleCache(key: string) {
  memoryCache.delete(key);
}

/**
 * Invalida todo o cache
 */
export function invalidateAllSimpleCache() {
  memoryCache.clear();
}
