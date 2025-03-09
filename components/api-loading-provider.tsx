"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface ApiLoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const ApiLoadingContext = createContext<ApiLoadingContextType | undefined>(
  undefined
);

export function ApiLoadingProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingRequests, setPendingRequests] = useState(0);

  const startLoading = () => {
    setPendingRequests((prev) => prev + 1);
  };

  const stopLoading = () => {
    setPendingRequests((prev) => Math.max(0, prev - 1));
  };

  useEffect(() => {
    setIsLoading(pendingRequests > 0);
  }, [pendingRequests]);

  // Intercept fetch requests
  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const [resource] = args;

      // Get the pathname from the request URL
      let pathname: string;
      if (resource instanceof URL) {
        pathname = resource.pathname;
      } else if (typeof resource === "string") {
        try {
          // Handle both absolute and relative URLs
          const url = resource.startsWith("http")
            ? new URL(resource)
            : new URL(resource, window.location.origin);
          pathname = url.pathname;
        } catch {
          pathname = resource;
        }
      } else if (resource instanceof Request) {
        pathname = new URL(resource.url).pathname;
      } else {
        pathname = "";
      }

      // Check if it's a chat route request
      const isChatRequest =
        pathname.includes("/chat") ||
        pathname.includes("/audio") ||
        pathname.includes("/transcribe");

      // Skip loading for root path
      const isRootPath = pathname === "/" || pathname === "";

      if (!isChatRequest && !isRootPath) {
        startLoading();
      }

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        if (!isChatRequest && !isRootPath) {
          stopLoading();
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <ApiLoadingContext.Provider
      value={{ isLoading, startLoading, stopLoading }}
    >
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="relative">
            <LoadingSpinner
              variant="primary"
              size="lg"
              className="animate-pulse"
            />
          </div>
        </div>
      )}
    </ApiLoadingContext.Provider>
  );
}

export function useApiLoading() {
  const context = useContext(ApiLoadingContext);
  if (context === undefined) {
    throw new Error("useApiLoading must be used within an ApiLoadingProvider");
  }
  return context;
}

// Custom hook for manual API loading control
export function useManualApiLoading() {
  const { startLoading, stopLoading } = useApiLoading();

  return {
    withLoading: async <T,>(promise: Promise<T>): Promise<T> => {
      startLoading();
      try {
        return await promise;
      } finally {
        stopLoading();
      }
    },
  };
}
