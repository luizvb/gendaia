"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export function ThemeImage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Image
      src={isDark ? "/demo.png" : "/demowhite.png"}
      alt="Demonstração da plataforma"
      fill
      className="object-cover"
      priority
    />
  );
}
