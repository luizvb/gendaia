"use client";

import { useState, useEffect } from "react";
import { useCachedFetch } from "@/components/hooks/use-cached-fetch";
import { CachedDashboardStats } from "@/components/dashboard/cached-dashboard-stats";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Clock, DollarSign, Scissors, Users } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

// Define types for the dashboard data
type DashboardData = {
  period: string;
  summary: {
    appointments: {
      count: number;
      change: number;
    };
    clients: {
      count: number;
      change: number;
    };
    services: {
      count: number;
      change: number;
    };
    revenue: {
      total: number;
      change: number;
    };
  };
  recentAppointments: Array<{
    id: string;
    start_time: string;
    clients: {
      id: string;
      name: string;
      phone: string;
    } | null;
    professionals: {
      id: string;
      name: string;
    } | null;
    services: {
      id: string;
      name: string;
      duration: number;
      price: number;
    } | null;
  }>;
  professionals: Array<{
    id: string;
    name: string;
    appointments: number;
    color: string;
  }>;
};

export default function DashboardPage() {
  const [period, setPeriod] = useState("daily");

  // Usando o hook de cache para buscar dados do dashboard
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useCachedFetch<DashboardData>(`/api/dashboard?period=${period}`, {
    // Cache por 5 minutos (300000ms)
    dedupingInterval: 300000,
    // Revalidar dados a cada 5 minutos
    refreshInterval: 300000,
  });

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Format time
  const formatTime = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Format date
  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="bg-red-50 dark:bg-red-950 p-4 rounded-md">
          <h2 className="text-red-600 dark:text-red-400 font-medium">
            Erro ao carregar dados
          </h2>
          <p className="text-sm mt-2">
            Não foi possível carregar os dados do dashboard. Tente novamente
            mais tarde.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading || !dashboardData) {
    return (
      <div className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="flex items-center mb-4 space-x-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full mb-2" />
                  <Skeleton className="h-4 w-1/3" />
                </CardContent>
              </Card>
            ))}
        </div>
        <h2 className="text-xl font-semibold mb-4">Agendamentos Recentes</h2>
        <div className="bg-card rounded-md shadow">
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Componente de estatísticas com cache */}
      <CachedDashboardStats />

      <h2 className="text-xl font-semibold mb-4 mt-8">Agendamentos Recentes</h2>
      <div className="bg-card rounded-md shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Cliente
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Serviço
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Profissional
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Horário
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium">
                  Valor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {dashboardData.recentAppointments.length > 0 ? (
                dashboardData.recentAppointments.map((appointment) => (
                  <tr key={appointment.id}>
                    <td className="px-4 py-3 text-sm">
                      {appointment.clients?.name || "Cliente removido"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {appointment.services?.name || "Serviço removido"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {appointment.professionals?.name ||
                        "Profissional removido"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(appointment.start_time)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatTime(appointment.start_time)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {appointment.services?.price
                        ? formatCurrency(appointment.services.price)
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    Nenhum agendamento recente encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 text-sm text-muted-foreground">
        <p>Os dados são atualizados automaticamente a cada 5 minutos.</p>
        <p>Última atualização: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
