export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";
import { createSimpleCachedHandler } from "@/lib/simple-cache";

// Interface para a resposta do dashboard
interface DashboardResponse {
  period: string;
  summary: {
    appointments: { count: number; change: number };
    clients: { count: number; change: number };
    services: { count: number; change: number };
    revenue: { total: number; change: number };
  };
  recentAppointments: any[];
  professionals: any[]; // Alterado para aceitar qualquer formato de profissionais
}

// Define types for Supabase responses
type AppointmentCount = {
  count: number;
};

type AppointmentClient = {
  client_id: string;
};

type AppointmentService = {
  service_id: string;
};

type AppointmentRevenue = {
  service_id: string;
  services: {
    price: number;
  } | null;
};

type Professional = {
  professional_id: string;
  professionals: {
    id: string;
    name: string;
    color: string;
  } | null;
};

type RecentAppointment = {
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
};

// Handler original para GET
async function getDashboardHandler(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "daily"; // daily, weekly, monthly

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Get current date
    const now = new Date();
    let startDate: Date;
    let endDate = new Date(now);

    // Set time to end of day
    endDate.setHours(23, 59, 59, 999);

    // Calculate start date based on period
    switch (period) {
      case "daily":
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "weekly":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "monthly":
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
    }

    // Format dates for Postgres
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();

    // Get appointments count for the period
    const { data, count: appointmentsCount } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("start_time", startDateStr)
      .lte("start_time", endDateStr);

    // Get clients count (unique clients with appointments in the period)
    const { data: clientsData } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("business_id", businessId)
      .gte("start_time", startDateStr)
      .lte("start_time", endDateStr);

    // Count unique clients
    const uniqueClients = clientsData
      ? new Set(clientsData.map((item) => item.client_id)).size
      : 0;

    // Get services count
    const { data: servicesData } = await supabase
      .from("appointments")
      .select("service_id")
      .eq("business_id", businessId)
      .gte("start_time", startDateStr)
      .lte("start_time", endDateStr);

    // Count total services
    const totalServices = servicesData ? servicesData.length : 0;

    // Calculate revenue
    const { data: revenueData } = await supabase
      .from("appointments")
      .select(
        `
        service_id,
        services:service_id (price)
      `
      )
      .eq("business_id", businessId)
      .gte("start_time", startDateStr)
      .lte("start_time", endDateStr);

    // Sum up the revenue
    const totalRevenue = revenueData
      ? revenueData.reduce((sum, appointment: any) => {
          const price = appointment.services?.price;
          return sum + (typeof price === "number" ? price : 0);
        }, 0)
      : 0;

    // Get recent appointments
    const { data: recentAppointments } = await supabase
      .from("appointments")
      .select(
        `
        id,
        start_time,
        clients:client_id (id, name, phone),
        professionals:professional_id (id, name),
        services:service_id (id, name, duration, price)
      `
      )
      .eq("business_id", businessId)
      .order("start_time", { ascending: false })
      .limit(5);

    // Get professionals
    const { data: professionalsData } = await supabase
      .from("professionals")
      .select("id, name")
      .eq("business_id", businessId);

    // Formatar os profissionais para o formato esperado
    const professionals = professionalsData
      ? professionalsData.map((prof) => ({
          id: prof.id,
          name: prof.name,
          appointments: 0, // Valor padrão
          color: "#3b82f6", // Cor padrão
        }))
      : [];

    // Calculate previous period for comparison
    let prevStartDate: Date;
    const prevEndDate = new Date(startDate);
    prevEndDate.setMilliseconds(prevEndDate.getMilliseconds() - 1);

    switch (period) {
      case "daily":
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
        break;
      case "weekly":
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 7);
        break;
      case "monthly":
        prevStartDate = new Date(startDate);
        prevStartDate.setMonth(prevStartDate.getMonth() - 1);
        break;
      default:
        prevStartDate = new Date(startDate);
        prevStartDate.setDate(prevStartDate.getDate() - 1);
    }

    // Format dates for Postgres
    const prevStartDateStr = prevStartDate.toISOString();
    const prevEndDateStr = prevEndDate.toISOString();

    // Get previous period data
    const { data: prevData, count: prevAppointmentsCount } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("business_id", businessId)
      .gte("start_time", prevStartDateStr)
      .lte("start_time", prevEndDateStr);

    const { data: prevClientsData } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("business_id", businessId)
      .gte("start_time", prevStartDateStr)
      .lte("start_time", prevEndDateStr);

    const prevUniqueClients = prevClientsData
      ? new Set(prevClientsData.map((item) => item.client_id)).size
      : 0;

    const { data: prevServicesData } = await supabase
      .from("appointments")
      .select("service_id")
      .eq("business_id", businessId)
      .gte("start_time", prevStartDateStr)
      .lte("start_time", prevEndDateStr);

    const prevTotalServices = prevServicesData ? prevServicesData.length : 0;

    const { data: prevRevenueData } = await supabase
      .from("appointments")
      .select(
        `
        service_id,
        services:service_id (price)
      `
      )
      .eq("business_id", businessId)
      .gte("start_time", prevStartDateStr)
      .lte("start_time", prevEndDateStr);

    const prevTotalRevenue = prevRevenueData
      ? prevRevenueData.reduce((sum, appointment: any) => {
          const price = appointment.services?.price;
          return sum + (typeof price === "number" ? price : 0);
        }, 0)
      : 0;

    // Calculate percentage changes
    const appointmentsChange = prevAppointmentsCount
      ? Math.round(
          (((appointmentsCount || 0) - prevAppointmentsCount) /
            prevAppointmentsCount) *
            100
        )
      : 0;

    const clientsChange = prevUniqueClients
      ? Math.round(
          ((uniqueClients - prevUniqueClients) / prevUniqueClients) * 100
        )
      : 0;

    const servicesChange = prevTotalServices
      ? Math.round(
          ((totalServices - prevTotalServices) / prevTotalServices) * 100
        )
      : 0;

    const revenueChange = prevTotalRevenue
      ? Math.round(((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100)
      : 0;

    // Prepare response
    const response: DashboardResponse = {
      period,
      summary: {
        appointments: {
          count: appointmentsCount || 0,
          change: appointmentsChange,
        },
        clients: {
          count: uniqueClients,
          change: clientsChange,
        },
        services: {
          count: totalServices,
          change: servicesChange,
        },
        revenue: {
          total: totalRevenue,
          change: revenueChange,
        },
      },
      recentAppointments: recentAppointments || [],
      professionals: professionals,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Erro ao buscar dados do dashboard:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}

// Aplicando cache simples ao handler GET
export const GET = createSimpleCachedHandler(getDashboardHandler, {
  // Cache por 5 minutos
  ttl: 300,
  // Função personalizada para gerar a chave de cache
  getCacheKey: (request) => {
    try {
      const url = new URL(request.url);
      const period = url.searchParams.get("period") || "daily";
      const businessId = request.headers.get("x-business-id") || "";

      // Criar uma chave de cache baseada no período e ID do negócio
      return `dashboard-${businessId}-${period}`;
    } catch (error) {
      console.error("Error creating cache key:", error);
      return "dashboard-default";
    }
  },
});
