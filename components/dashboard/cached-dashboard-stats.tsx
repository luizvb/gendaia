"use client";

import { useCachedFetch } from "@/components/hooks/use-cached-fetch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

interface DashboardSummary {
  appointments: { count: number; change: number };
  clients: { count: number; change: number };
  services: { count: number; change: number };
  revenue: { total: number; change: number };
}

interface DashboardData {
  period: string;
  summary: DashboardSummary;
  recentAppointments: any[];
  professionals: any[];
}

export function CachedDashboardStats() {
  const [period, setPeriod] = useState("daily");

  // Using our cached fetch hook
  const { data, isLoading, error } = useCachedFetch<DashboardData>(
    `/api/dashboard?period=${period}`,
    {
      // Cache for 5 minutes (300000ms)
      dedupingInterval: 300000,
      // Revalidate data every 5 minutes
      refreshInterval: 300000,
    }
  );

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-red-50 dark:bg-red-950">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 dark:text-red-400">
              Erro ao carregar dados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              Não foi possível carregar os dados do dashboard.
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
    );
  }

  const { summary } = data;

  return (
    <>
      <div className="flex items-center mb-4 space-x-2">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-1.5 text-sm border rounded-md bg-background"
        >
          <option value="daily">Hoje</option>
          <option value="weekly">Esta semana</option>
          <option value="monthly">Este mês</option>
        </select>
        <div className="text-sm text-muted-foreground">
          Dados em cache por 5 minutos
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary.appointments.count}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.appointments.change > 0 ? "+" : ""}
              {summary.appointments.change}% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.clients.count}</div>
            <p className="text-xs text-muted-foreground">
              {summary.clients.change > 0 ? "+" : ""}
              {summary.clients.change}% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Serviços</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.services.count}</div>
            <p className="text-xs text-muted-foreground">
              {summary.services.change > 0 ? "+" : ""}
              {summary.services.change}% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary.revenue.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary.revenue.change > 0 ? "+" : ""}
              {summary.revenue.change}% em relação ao período anterior
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
