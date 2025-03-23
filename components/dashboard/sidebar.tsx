"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Scissors,
  Settings,
  Users,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export const navigation = [
  { name: "Agenda", href: "/dashboard/calendar", icon: Calendar },
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Clientes", href: "/dashboard/clients", icon: Users },
  { name: "Serviços", href: "/dashboard/services", icon: Scissors },
  { name: "Profissionais", href: "/dashboard/professionals", icon: Users },
  { name: "WhatsApp", href: "/dashboard/whatsapp", icon: MessageSquare },
  { name: "Assinatura", href: "/dashboard/subscription", icon: CreditCard },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [businessInfo, setBusinessInfo] = useState<{
    name: string;
    logo: string | null;
  } | null>(null);

  useEffect(() => {
    async function loadBusinessInfo() {
      try {
        const response = await fetch("/api/settings");
        if (response.ok) {
          const data = await response.json();
          if (data.business) {
            setBusinessInfo({
              name: data.business.name || "GENDAIA",
              logo: data.business.logo || null,
            });
          }
        }
      } catch (error) {
        console.error("Error loading business info:", error);
      }
    }

    loadBusinessInfo();
  }, []);

  return (
    <div
      className={cn(
        "hidden h-screen border-r bg-background transition-all duration-300 lg:flex",
        collapsed ? "w-[80px]" : "w-[240px]",
        className
      )}
    >
      <div className="flex h-full w-full flex-col">
        <div
          className={cn(
            "flex h-16 items-center border-b px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2">
              {businessInfo?.logo ? (
                <div className="h-8 w-8 relative">
                  <Image
                    src={businessInfo.logo}
                    alt={businessInfo.name}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : null}
              <span className="text-xl font-semibold tracking-tight">
                {businessInfo?.name || "GENDAIA"}
              </span>
            </Link>
          ) : businessInfo?.logo ? (
            <Link
              href="/dashboard/calendar"
              className="flex items-center justify-center"
            >
              <div className="h-8 w-8 relative">
                <Image
                  src={businessInfo.logo}
                  alt={businessInfo.name || "GENDAIA"}
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
          ) : (
            <Link
              href="/dashboard/calendar"
              className="flex items-center justify-center"
            >
              <span className="text-xl font-semibold tracking-tight">G</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir" : "Colapsar"}
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
        </div>

        <nav className="flex-1 space-y-1 p-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed ? "justify-center" : "gap-3"
              )}
            >
              <item.icon
                className={cn("h-5 w-5", collapsed ? "mx-0" : "mr-2")}
              />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
