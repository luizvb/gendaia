"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { SplashScreen } from "@/components/splash-screen";

export function PageLoading() {
  const [isChangingRoute, setIsChangingRoute] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Reset state when route changes
    setIsChangingRoute(false);
  }, [pathname, searchParams]);

  // Listen for route change start
  useEffect(() => {
    const handleRouteChangeStart = () => {
      setIsChangingRoute(true);
    };

    const handleRouteChangeComplete = () => {
      setIsChangingRoute(false);
    };

    window.addEventListener("beforeunload", handleRouteChangeStart);

    // For Next.js App Router, we can use the router events
    if (typeof window !== "undefined") {
      document.addEventListener(
        "next-route-announcer-focus",
        handleRouteChangeComplete
      );
    }

    return () => {
      window.removeEventListener("beforeunload", handleRouteChangeStart);
      if (typeof window !== "undefined") {
        document.removeEventListener(
          "next-route-announcer-focus",
          handleRouteChangeComplete
        );
      }
    };
  }, []);

  // Show splash screen on initial load
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    // Mark initial load as complete after splash screen is shown
    const timer = setTimeout(() => {
      setInitialLoad(false);
    }, 2000); // Slightly longer than the minimum display time of SplashScreen

    return () => clearTimeout(timer);
  }, []);

  if (initialLoad) {
    return <SplashScreen subtitle="Carregando aplicação..." />;
  }

  if (isChangingRoute) {
    return (
      <SplashScreen minimumDisplayTime={500} subtitle="Carregando página..." />
    );
  }

  return null;
}
