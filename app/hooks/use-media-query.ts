"use client";

import { useState, useEffect } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // Check if window is defined (to prevent SSR issues)
    if (typeof window === "undefined") return;

    const media = window.matchMedia(query);
    // Set initial value
    setMatches(media.matches);

    // Define a callback function to handle changes
    const listener = () => setMatches(media.matches);

    // Add the listener
    window.addEventListener("resize", listener);

    // Clean up
    return () => window.removeEventListener("resize", listener);
  }, [query]);

  return matches;
}
