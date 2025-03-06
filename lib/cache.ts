import { unstable_cache } from "next/cache";

/**
 * Cache a server function with Next.js unstable_cache
 *
 * @param fn The function to cache
 * @param keyParts Array of strings to use as cache key parts
 * @param options Cache options
 * @returns Cached function
 */
export function cacheServerFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  keyParts: string[] = [],
  options: {
    revalidate?: number | false;
    tags?: string[];
  } = {}
): T {
  return unstable_cache(fn, keyParts, {
    revalidate: options.revalidate ?? 300, // Default to 5 minutes
    tags: options.tags ?? [],
  }) as T;
}

/**
 * Create a cached API route handler
 *
 * @param handler The API route handler function
 * @param options Cache options
 * @returns Cached API route handler
 */
export function createCachedApiHandler<
  T extends (...args: any[]) => Promise<Response>
>(
  handler: T,
  options: {
    revalidate?: number | false;
    tags?: string[];
    getCacheKey?: (request: Request) => string[];
  } = {}
): T {
  // Retornamos uma função que será usada como handler da rota
  const cachedHandler = (async (...args: Parameters<T>) => {
    try {
      const request = args[0] as Request;

      // Get cache key parts
      const keyParts = options.getCacheKey
        ? options.getCacheKey(request)
        : [request.url];

      // Criamos uma função wrapper que chama o handler original
      const wrappedHandler = async () => {
        return handler(...args);
      };

      // Criamos uma versão em cache da função wrapper
      const cachedFunction = cacheServerFunction(wrappedHandler, keyParts, {
        revalidate: options.revalidate,
        tags: options.tags,
      });

      // Chamamos a função em cache
      return await cachedFunction();
    } catch (error) {
      console.error("Error in cached API handler:", error);
      // Em caso de erro, chamamos o handler original sem cache
      return handler(...args);
    }
  }) as T;

  return cachedHandler;
}
