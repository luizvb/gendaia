"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  Menu,
  Scissors,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Agenda", href: "/dashboard/calendar", icon: Calendar },
  { name: "Clientes", href: "/dashboard/clients", icon: Users },
  { name: "Serviços", href: "/dashboard/services", icon: Scissors },
  { name: "Profissionais", href: "/dashboard/professionals", icon: Users },
  { name: "Assinatura", href: "/dashboard/subscription", icon: CreditCard },
  { name: "Configurações", href: "/dashboard/settings", icon: Settings },
];

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Sidebar para desktop */}
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
            {!collapsed && (
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-xl font-semibold tracking-tight">
                  GENDAIA
                </span>
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

      {/* Sidebar móvel (Sheet) */}
      <div className="lg:hidden">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="ml-2">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Abrir menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[240px] p-0">
            <div className="flex h-16 items-center border-b px-4">
              <Link href="/dashboard" className="flex items-center gap-2">
                <span className="text-xl font-semibold tracking-tight">
                  GENDAIA
                </span>
              </Link>
            </div>
            <nav className="flex-1 space-y-1 p-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              ))}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
