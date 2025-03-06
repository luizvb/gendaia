"use client";

import { SWRConfig } from "swr";
import { ReactNode } from "react";

interface SWRProviderProps {
  children: ReactNode;
}

export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig
      value={{
        // Global SWR configuration
        revalidateOnFocus: false,
        revalidateIfStale: true,
        revalidateOnReconnect: true,
        dedupingInterval: 5000,
        errorRetryCount: 3,
        // Optional global fetcher
        fetcher: async (url: string) => {
          const response = await fetch(url);
          if (!response.ok) {
            const error = new Error(
              "An error occurred while fetching the data."
            );
            (error as any).info = await response.json();
            (error as any).status = response.status;
            throw error;
          }
          return response.json();
        },
        // Optional onError handler
        onError: (error, key) => {
          console.error(`SWR Error for ${key}:`, error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
