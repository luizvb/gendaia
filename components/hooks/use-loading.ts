"use client";

import { useApiLoading } from "@/components/api-loading-provider";

/**
 * Hook for manually controlling the API loading indicator
 *
 * @example
 * const { withLoading } = useLoading()
 *
 * // Use with async functions
 * const handleSubmit = async () => {
 *   await withLoading(async () => {
 *     // Your async code here
 *     await saveData()
 *   })
 * }
 *
 * // Use with promises
 * const fetchData = () => {
 *   withLoading(fetch('/api/data').then(res => res.json()))
 *     .then(data => setData(data))
 * }
 */
export function useLoading() {
  const { startLoading, stopLoading } = useApiLoading();

  return {
    /**
     * Executes a function or promise while showing the loading indicator
     */
    withLoading: async <T>(
      promiseOrFn: Promise<T> | (() => Promise<T>)
    ): Promise<T> => {
      startLoading();
      try {
        if (typeof promiseOrFn === "function") {
          return await promiseOrFn();
        }
        return await promiseOrFn;
      } finally {
        stopLoading();
      }
    },
  };
}
