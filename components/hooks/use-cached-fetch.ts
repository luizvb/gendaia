"use client";

import useSWR, { SWRConfiguration } from "swr";

// Global fetcher function that will be used by SWR
const defaultFetcher = async (url: string) => {
  const response = await fetch(url);

  // If the status code is not in the range 200-299,
  // throw an error to be caught by SWR
  if (!response.ok) {
    const error = new Error("An error occurred while fetching the data.");
    // Add extra info to the error object
    (error as any).info = await response.json();
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
};

interface UseCachedFetchOptions<T> extends SWRConfiguration {
  initialData?: T;
}

/**
 * Custom hook for fetching data with caching using SWR
 *
 * @param url The URL to fetch data from
 * @param options SWR configuration options
 * @returns SWR response object with data, error, and loading state
 */
export function useCachedFetch<T = any>(
  url: string | null,
  options: UseCachedFetchOptions<T> = {}
) {
  const { initialData, ...swrOptions } = options;

  const { data, error, isLoading, isValidating, mutate } = useSWR<T>(
    url,
    defaultFetcher,
    {
      revalidateOnFocus: false, // Don't revalidate when window gets focus
      revalidateIfStale: true, // Revalidate if data is stale
      revalidateOnReconnect: true, // Revalidate when browser regains connection
      dedupingInterval: 5000, // Dedupe requests with the same key in this time span
      ...swrOptions,
      fallbackData: initialData, // Use initialData as fallback
    }
  );

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    // Helper computed property
    isError: !!error,
  };
}

// Export a version with POST support
export async function fetchWithMethod(
  url: string,
  method: string,
  body?: any,
  headers?: HeadersInit
) {
  const options: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the data.");
    (error as any).info = await response.json();
    (error as any).status = response.status;
    throw error;
  }

  return response.json();
}
