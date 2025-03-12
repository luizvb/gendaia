"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
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

  const startLoading = useCallback(() => {
    setPendingRequests((prev) => prev + 1);
  }, []);

  const stopLoading = useCallback(() => {
    setPendingRequests((prev) => Math.max(0, prev - 1));
  }, []);

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
      try {
        if (resource instanceof URL) {
          pathname = resource.pathname;
        } else if (typeof resource === "string") {
          // Handle both absolute and relative URLs
          const url = resource.startsWith("http")
            ? new URL(resource)
            : new URL(resource, window.location.origin);
          pathname = url.pathname;
        } else if (resource instanceof Request) {
          pathname = new URL(resource.url).pathname;
        } else {
          pathname = "";
        }
      } catch {
        pathname = "";
      }

      // Check if it's a chat route request
      const isChatRequest =
        pathname.includes("/chat") ||
        pathname.includes("/audio") ||
        pathname.includes("/transcribe");

      // Skip loading for root path and static assets
      const isRootPath = pathname === "/" || pathname === "";
      const isStaticAsset = pathname.match(
        /\.(ico|png|jpg|jpeg|gif|svg|js|css)$/
      );

      if (!isChatRequest && !isRootPath && !isStaticAsset) {
        startLoading();
      }

      try {
        const response = await originalFetch(...args);
        return response;
      } finally {
        if (!isChatRequest && !isRootPath && !isStaticAsset) {
          stopLoading();
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [startLoading, stopLoading]);

  return (
    <ApiLoadingContext.Provider
      value={{ isLoading, startLoading, stopLoading }}
    >
      {children}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
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
