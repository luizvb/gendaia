# Estratégia de Cache da Plataforma

Este documento descreve a estratégia de cache implementada na plataforma para melhorar o desempenho e reduzir a carga no servidor.

## Tipos de Cache Implementados

### 1. Cache no Cliente (SWR)

Utilizamos a biblioteca SWR (Stale-While-Revalidate) para implementar cache no lado do cliente. O SWR armazena os dados em memória no navegador e os revalida automaticamente quando necessário.

**Arquivos principais:**

- `components/hooks/use-cached-fetch.ts` - Hook personalizado para fazer requisições com cache
- `components/swr-provider.tsx` - Provedor global de configurações do SWR

**Como usar:**

```tsx
import { useCachedFetch } from "@/components/hooks/use-cached-fetch";

function MyComponent() {
  const { data, isLoading, error } = useCachedFetch("/api/endpoint");

  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar dados</div>;

  return <div>{data.name}</div>;
}
```

### 2. Cache no Servidor (Implementação Simples)

Implementamos um sistema de cache em memória no servidor para armazenar respostas de API, reduzindo a carga no banco de dados.

**Arquivos principais:**

- `lib/simple-cache.ts` - Utilitários para cache no servidor
- `lib/cache-utils.ts` - Utilitários para invalidação de cache

**Como usar em rotas de API:**

```tsx
import { createSimpleCachedHandler } from "@/lib/simple-cache";

async function handler(request) {
  // Lógica da API
  return Response.json(data);
}

export const GET = createSimpleCachedHandler(handler, {
  ttl: 300, // Cache por 5 minutos
  getCacheKey: (request) => `chave-personalizada-${request.url}`,
});
```

**Invalidação de cache:**

```tsx
import { invalidateSimpleCache } from "@/lib/simple-cache";
import { invalidateCacheTags, CacheTags } from "@/lib/cache-utils";

// Em uma rota que modifica dados
export async function POST(request) {
  // Lógica para criar/atualizar dados

  // Invalidar caches relacionados
  try {
    // Tentativa de invalidar cache por tag (Next.js)
    invalidateCacheTags([CacheTags.DASHBOARD, CacheTags.APPOINTMENTS]);

    // Invalidar cache simples
    invalidateSimpleCache(`chave-personalizada`);
  } catch (error) {
    console.error("Erro ao invalidar cache:", error);
    // Continuar mesmo se a invalidação falhar
  }

  return Response.json({ success: true });
}
```

## Estratégia de Cache por Recurso

| Recurso       | Tempo de Cache | Chave de Cache                            | Estratégia de Invalidação                  |
| ------------- | -------------- | ----------------------------------------- | ------------------------------------------ |
| Dashboard     | 5 minutos      | `dashboard-{businessId}-{period}`         | Após criar/atualizar/excluir agendamentos  |
| Agendamentos  | 5 minutos      | `appointments-{businessId}-phone-{phone}` | Após criar/atualizar/excluir agendamentos  |
| Clientes      | 10 minutos     | `clients-{businessId}-{filtros}`          | Após criar/atualizar/excluir clientes      |
| Serviços      | 30 minutos     | `services-{businessId}`                   | Após criar/atualizar/excluir serviços      |
| Profissionais | 30 minutos     | `professionals-{businessId}`              | Após criar/atualizar/excluir profissionais |

## Benefícios

1. **Melhor desempenho** - Redução no tempo de carregamento após a primeira requisição
2. **Menor carga no servidor** - Redução no número de requisições ao banco de dados
3. **Melhor experiência do usuário** - Interface mais responsiva
4. **Economia de recursos** - Menor consumo de banda e processamento

## Considerações

- O cache no cliente (SWR) é invalidado automaticamente quando o usuário navega para outra página
- O cache no servidor é invalidado quando os dados são modificados
- É possível forçar a revalidação do cache usando os utilitários de invalidação
- Em caso de falha no cache, o sistema continua funcionando normalmente, apenas sem o benefício do cache

## Solução de Problemas

Se você encontrar problemas com o cache:

1. Verifique os logs do servidor para erros relacionados ao cache
2. Tente limpar o cache do navegador
3. Verifique se as chaves de cache estão sendo geradas corretamente
4. Verifique se a invalidação de cache está funcionando corretamente

Para testar o cache, você pode usar as rotas de teste:

- `/api/test-cache` - Testa o cache do Next.js
- `/api/test-simple-cache` - Testa o cache simples em memória
