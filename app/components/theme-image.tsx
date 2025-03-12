"use client";

import Image from "next/image";
import { useTheme } from "next-themes";

export function ThemeImage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Image
      alt="Demo"
      className="object-cover"
      height={350}
      width={500}
      priority={false}
      src={isDark ? "/demowhite.png" : "/demowhite.png"}
    />
  );
}
