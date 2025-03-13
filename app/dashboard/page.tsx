"use client";

import { useState, useEffect } from "react";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

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
  charts: {
    dailyStats: Array<{
      date: string;
      appointments: number;
      revenue: number;
    }>;
    topServices: Array<{
      name: string;
      count: number;
      percentage: number;
    }>;
  };
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function DashboardPage() {
  const [period, setPeriod] = useState("weekly");
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/dashboard?period=${period}`);
        if (!response.ok) throw new Error("Failed to fetch dashboard data");
        const data = await response.json();
        setDashboardData(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
    // Refresh every 5 minutes
    const interval = setInterval(fetchDashboardData, 300000);
    return () => clearInterval(interval);
  }, [period]);

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

  // Format date for charts
  const formatChartDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
  };

  // Get period description
  const getPeriodDescription = () => {
    switch (period) {
      case "daily":
        return "Hoje";
      case "weekly":
        return "Últimos 7 dias";
      case "monthly":
        return "Últimos 30 dias";
      default:
        return "Últimos 7 dias";
    }
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
      <div className="container ">
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
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Diário</SelectItem>
            <SelectItem value="weekly">Semanal</SelectItem>
            <SelectItem value="monthly">Mensal</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Agendamentos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.summary.appointments.count}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.summary.appointments.change}% em relação ao período
              anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.summary.clients.count}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.summary.clients.change}% em relação ao período
              anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Serviços</CardTitle>
            <Scissors className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.summary.services.count}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.summary.services.change}% em relação ao período
              anterior
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardData.summary.revenue.total)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.summary.revenue.change}% em relação ao período
              anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2 mb-6">
        {/* Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Agendamentos e Faturamento</CardTitle>
            <CardDescription>{getPeriodDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dashboardData?.charts.dailyStats}
                  margin={{ top: 5, right: 30, left: 20, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickFormatter={formatChartDate} />
                  <YAxis yAxisId="left" tickFormatter={(value) => value} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === "Faturamento") return formatCurrency(value);
                      return value;
                    }}
                    labelFormatter={formatChartDate}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="appointments"
                    stroke="#0088FE"
                    name="Agendamentos"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenue"
                    stroke="#00C49F"
                    name="Faturamento"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Serviços Mais Realizados</CardTitle>
            <CardDescription>{getPeriodDescription()}</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isLoading ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <div className="flex items-center justify-between h-full">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={dashboardData?.charts.topServices}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percentage }) =>
                        `${name} (${percentage}%)`
                      }
                    >
                      {dashboardData?.charts.topServices.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-[40%] pl-4">
                  <ul className="space-y-2">
                    {dashboardData?.charts.topServices.map((service, index) => (
                      <li
                        key={service.name}
                        className="flex items-center text-sm"
                      >
                        <span
                          className="w-3 h-3 rounded-full mr-2"
                          style={{
                            backgroundColor: COLORS[index % COLORS.length],
                          }}
                        />
                        <span className="truncate">{service.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
