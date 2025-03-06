import { NextRequest, NextResponse } from "next/server";
import { createCachedApiHandler } from "./cache";
import { CacheTags } from "./cache-utils";

/**
 * Configurações de cache padrão para diferentes tipos de recursos
 */
export const DefaultCacheConfig = {
  dashboard: {
    revalidate: 300, // 5 minutos
    tags: [CacheTags.DASHBOARD],
  },
  appointments: {
    revalidate: 300, // 5 minutos
    tags: [CacheTags.APPOINTMENTS],
  },
  clients: {
    revalidate: 600, // 10 minutos
    tags: [CacheTags.CLIENTS],
  },
  services: {
    revalidate: 1800, // 30 minutos
    tags: [CacheTags.SERVICES],
  },
  professionals: {
    revalidate: 1800, // 30 minutos
    tags: [CacheTags.PROFESSIONALS],
  },
  business: {
    revalidate: 3600, // 1 hora
    tags: [CacheTags.BUSINESS],
  },
  user: {
    revalidate: 300, // 5 minutos
    tags: [CacheTags.USER],
  },
};

/**
 * Cria um handler de API com cache para rotas GET
 *
 * @param handler Função handler da rota
 * @param resourceType Tipo de recurso (para usar configuração padrão)
 * @param customConfig Configuração personalizada (opcional)
 * @returns Handler com cache
 */
export function createCachedGetHandler(
  handler: (request: NextRequest) => Promise<NextResponse>,
  resourceType: keyof typeof DefaultCacheConfig,
  customConfig?: {
    revalidate?: number | false;
    tags?: string[];
    getCacheKey?: (request: Request) => string[];
  }
) {
  const config = DefaultCacheConfig[resourceType];

  // Criamos uma função que será usada como handler da rota
  return createCachedApiHandler(handler, {
    revalidate: customConfig?.revalidate ?? config.revalidate,
    tags: customConfig?.tags ?? config.tags,
    getCacheKey:
      customConfig?.getCacheKey ??
      ((request) => {
        try {
          const url = new URL(request.url);
          const businessId = request.headers.get("x-business-id") || "";

          // Criar uma chave de cache baseada no tipo de recurso, ID do negócio e parâmetros da URL
          return [
            `${resourceType}-${businessId}-${url.searchParams.toString()}`,
          ];
        } catch (error) {
          console.error("Error creating cache key:", error);
          // Em caso de erro, usamos uma chave padrão
          return [`${resourceType}-default`];
        }
      }),
  });
}
