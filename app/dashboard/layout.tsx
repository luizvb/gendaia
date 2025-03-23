"use client";

import type React from "react";
import Link from "next/link";
import {
  Bell,
  ChevronDown,
  LogOut,
  Bot,
  Menu,
  Maximize,
  Minimize,
  Download,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar, navigation } from "@/components/dashboard/sidebar";
import { createClient } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";
import { ChatDrawerContent } from "@/components/chat-drawer-content";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { IOSPWAPrompt } from "@/components/ios-pwa-prompt";
import { Toaster } from "sonner";
import Image from "next/image";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

  return isMobile;
}

// Hook para controlar o fullscreen
function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    // Check if running on mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // For mobile devices, try to use fullscreen API first
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          document.documentElement
            .requestFullscreen()
            .then(() => {
              setIsFullscreen(true);
            })
            .catch((err) => {
              console.error(`Error entering fullscreen: ${err.message}`);
              // If fullscreen fails, we'll return false so the PWA prompt can be shown
              return false;
            });
        } else {
          // Fullscreen API not supported, return false to show PWA prompt
          return false;
        }
      } else {
        if (document.exitFullscreen) {
          document
            .exitFullscreen()
            .then(() => {
              setIsFullscreen(false);
            })
            .catch((err) => {
              console.error(`Error exiting fullscreen: ${err.message}`);
            });
        }
      }
    } else {
      // Desktop behavior remains the same
      if (!document.fullscreenElement) {
        document.documentElement
          .requestFullscreen()
          .then(() => {
            setIsFullscreen(true);
          })
          .catch((err) => {
            console.error(`Error entering fullscreen: ${err.message}`);
          });
      } else {
        if (document.exitFullscreen) {
          document
            .exitFullscreen()
            .then(() => {
              setIsFullscreen(false);
            })
            .catch((err) => {
              console.error(`Error exiting fullscreen: ${err.message}`);
            });
        }
      }
    }

    // Return true if fullscreen was toggled successfully
    return !!document.fullscreenElement || !isMobile;
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return { isFullscreen, toggleFullscreen };
}

// Hook para controlar o prompt de instalação do PWA
function usePWAInstall() {
  const [showPrompt, setShowPrompt] = useState(false);

  const togglePrompt = () => {
    setShowPrompt(!showPrompt);
  };

  return { showPrompt, setShowPrompt, togglePrompt };
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [profile, setProfile] = useState<{
    full_name: string;
    avatar_url: string | null;
    role: string;
  } | null>(null);
  const [businessInfo, setBusinessInfo] = useState<{
    name: string;
    logo: string | null;
  } | null>(null);

  const { isFullscreen, toggleFullscreen } = useFullscreen();
  const { showPrompt, setShowPrompt, togglePrompt } = usePWAInstall();

  useEffect(() => {
    if (isMobile) setIsDrawerOpen(false);
  }, [isMobile]);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, role")
          .eq("user_id", user.id)
          .single();

        if (data) {
          setProfile(data);
        }
      }
    }

    loadProfile();
  }, [supabase]);

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Get initials from full name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase();
  };

  const handleFullscreenClick = () => {
    // If toggleFullscreen returns false, it means fullscreen failed or isn't supported
    // In that case, show the PWA prompt
    const fullscreenToggled = toggleFullscreen();
    if (!fullscreenToggled) {
      setShowPrompt(true);
    }
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      <Sidebar className="z-30" />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex w-full items-center justify-between lg:justify-end gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[240px] p-0">
                <div className="flex h-16 items-center border-b px-4">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    {businessInfo?.logo ? (
                      <div className="h-8 w-8 relative">
                        <Image
                          src={businessInfo.logo}
                          alt={businessInfo.name}
                          fill
                          className="object-contain h-8 w-8"
                        />
                      </div>
                    ) : null}
                    <span className="text-xl font-semibold tracking-tight">
                      {businessInfo?.name || "GENDAIA"}
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
                      onClick={() => isMobile && setIsDrawerOpen(false)}
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative group h-10 w-10",
                  isDrawerOpen ? "bg-accent" : "hover:bg-accent/50",
                  "overflow-hidden transition-all duration-300"
                )}
                onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              >
                <div className="absolute inset-0 bg-primary/5 animate-pulse transition-colors duration-800" />
                <Bot
                  className={cn(
                    "h-5 w-5 transition-all duration-800 transform",
                    "animate-[bounce_1.5s_ease-in-out_infinite]",
                    isDrawerOpen ? "rotate-12 scale-110" : "rotate-0 scale-100",
                    "group-hover:rotate-12"
                  )}
                />
                <span
                  className={cn(
                    "absolute bottom-1.5 left-1/2 h-0.5 bg-primary rounded-full transition-all duration-800",
                    "animate-[glow_2s_ease-in-out_infinite]",
                    "-translate-x-1/2 w-4",
                    "opacity-40 group-hover:opacity-100"
                  )}
                />
                <style jsx>{`
                  @keyframes bounce {
                    0%,
                    100% {
                      transform: translateY(0) rotate(-5deg);
                    }
                    50% {
                      transform: translateY(-4px) rotate(5deg);
                    }
                  }
                  @keyframes glow {
                    0%,
                    100% {
                      opacity: 0.4;
                    }
                    50% {
                      opacity: 0.7;
                    }
                  }
                  .animate-[bounce_1.5s_ease-in-out_infinite] {
                    animation: bounce 1s ease-in-out infinite;
                  }
                  .animate-[glow_2s_ease-in-out_infinite] {
                    animation: glow 1.2s ease-in-out infinite;
                  }
                `}</style>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFullscreenClick}
                title={
                  isFullscreen
                    ? "Sair do modo tela cheia"
                    : "Entrar em tela cheia"
                }
              >
                {isFullscreen ? (
                  <Minimize className="h-5 w-5" />
                ) : (
                  <Maximize className="h-5 w-5" />
                )}
                <span className="sr-only">
                  {isFullscreen
                    ? "Sair do modo tela cheia"
                    : "Entrar em tela cheia"}
                </span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={togglePrompt}
                title="Instalar na tela inicial"
                className="md:flex hidden"
              >
                <Download className="h-5 w-5" />
                <span className="sr-only">Instalar na tela inicial</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2 pl-2 pr-4">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>
                        {profile?.full_name
                          ? getInitials(profile.full_name)
                          : ""}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline-flex min-w-24">
                      {profile ? (
                        profile.full_name
                      ) : (
                        <Skeleton className="h-4 w-24" />
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      {profile ? (
                        <>
                          <p className="text-sm font-medium leading-none">
                            {profile.full_name}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {profile.role}
                          </p>
                        </>
                      ) : (
                        <>
                          <Skeleton className="h-4 w-32 mb-1" />
                          <Skeleton className="h-3 w-24" />
                        </>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />

                  <DropdownMenuItem>
                    <Link
                      href="/dashboard/settings"
                      className="flex w-full items-center"
                    >
                      Configurações
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleSignOut}>
                    <div className="flex w-full items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>
        <div className={cn("flex flex-1 relative overflow-hidden")}>
          <main
            className={cn(
              "flex-1 min-w-0 transition-all duration-300 overflow-y-auto",
              isDrawerOpen ? "mr-[400px] lg:mr-[400px] md:mr-0" : "mr-0"
            )}
          >
            <div className="p-4 md:p-6">{children}</div>
          </main>
          <div
            className={cn(
              "fixed md:fixed top-16 right-0 bg-background z-30",
              "transition-transform duration-300 shadow-lg",
              "md:w-[400px] md:h-[calc(100vh-4rem)]",
              "w-full h-[calc(100vh-9rem)]",
              "flex flex-col overflow-hidden",
              isDrawerOpen ? "translate-x-0" : "translate-x-full"
            )}
          >
            <ChatDrawerContent />
          </div>
        </div>
      </div>
      <IOSPWAPrompt
        forceShow={showPrompt}
        onClose={() => setShowPrompt(false)}
      />
      <Toaster position="top-right" />
    </div>
  );
}
