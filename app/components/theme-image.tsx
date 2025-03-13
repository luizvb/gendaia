"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

interface ThemeImageProps {
  className?: string;
}

export function ThemeImage({ className }: ThemeImageProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Image
      alt="Demo"
      className={className || "object-contain w-full h-full rounded-xl"}
      height={350}
      width={900}
      priority={false}
      src={isDark ? "/demo.png" : "/demowhite.png"}
    />
  );
}
