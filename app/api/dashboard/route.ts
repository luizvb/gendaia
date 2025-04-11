export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";

// Interface para a resposta do dashboard
interface DashboardResponse {
  period: string;
  summary: {
    appointments: { count: number; change: number };
    clients: { count: number; change: number };
    services: { count: number; change: number };
    revenue: { total: number; change: number };
    professionals: { count: number }; // Total de profissionais
    topProfessional: { id: string; name: string; count: number } | null; // Profissional com mais atendimentos
    topClient: { id: string; name: string; count: number } | null; // Cliente com mais atendimentos
  };
  recentAppointments: any[];
  professionals: any[]; // Alterado para aceitar qualquer formato de profissionais
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
    topProfessionals: Array<{
      id: string;
      name: string;
      count: number;
    }>;
    topClients: Array<{
      id: string;
      name: string;
      count: number;
    }>;
  };
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

// Handler GET sem cache
export const GET = async (request: NextRequest) => {
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
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

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
    let endDate: Date;

    if (startDateParam && endDateParam) {
      // Use provided date range if available
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0);

      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999);
    } else {
      // Fall back to calculated dates based on period
      endDate = new Date(now);
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
    const { data: professionalsData, count: professionalsCount } =
      await supabase
        .from("professionals")
        .select("id, name", { count: "exact" })
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

    // Get daily stats for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: dailyStatsData } = await supabase
      .from("appointments")
      .select(
        `
        start_time,
        services:service_id (price)
      `
      )
      .eq("business_id", businessId)
      .gte("start_time", thirtyDaysAgo.toISOString())
      .lte("start_time", endDateStr);

    // Process daily stats
    const dailyStats = dailyStatsData?.reduce(
      (
        acc: Record<string, { appointments: number; revenue: number }>,
        appointment: any
      ) => {
        const date = new Date(appointment.start_time)
          .toISOString()
          .split("T")[0];
        if (!acc[date]) {
          acc[date] = { appointments: 0, revenue: 0 };
        }
        acc[date].appointments++;

        // Access price safely with proper type checking
        let price = 0;
        if (appointment.services && typeof appointment.services === "object") {
          price =
            typeof appointment.services.price === "number"
              ? appointment.services.price
              : 0;
        }
        acc[date].revenue += price;

        return acc;
      },
      {}
    );

    // Convert to array and sort by date
    const dailyStatsArray = Object.entries(dailyStats || {})
      .map(([date, stats]: [string, any]) => ({
        date,
        ...stats,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Get top services
    const { data: topServicesData } = await supabase
      .from("appointments")
      .select(
        `
        services:service_id (
          id,
          name
        )
      `
      )
      .eq("business_id", businessId)
      .gte("start_time", startDateStr)
      .lte("start_time", endDateStr);

    // Process top services
    const servicesCount = topServicesData?.reduce(
      (acc: Record<string, number>, appointment: any) => {
        // Extract service name safely with proper type checking
        let serviceName = "Desconhecido";
        if (appointment.services && typeof appointment.services === "object") {
          serviceName =
            typeof appointment.services.name === "string"
              ? appointment.services.name
              : "Desconhecido";
        }

        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      },
      {}
    );

    // Calculate total services with proper typing
    const totalServicesCount: number = Object.values(
      servicesCount || {}
    ).reduce((a: number, b: number) => a + b, 0);

    const topServices = Object.entries(servicesCount || {})
      .map(([name, count]: [string, any]) => ({
        name,
        count,
        percentage: Math.round((count / totalServicesCount) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get top professional (with most appointments)
    const { data: topProfessionalData } = await supabase
      .from("appointments")
      .select(
        `
        professional_id,
        professionals:professional_id (id, name)
      `
      )
      .eq("business_id", businessId)
      .gte("start_time", startDateStr)
      .lte("start_time", endDateStr);

    // Count appointments per professional
    const professionalAppointments = topProfessionalData?.reduce(
      (acc: Record<string, number>, appointment: any) => {
        const professionalId = appointment.professional_id?.toString();
        if (professionalId) {
          acc[professionalId] = (acc[professionalId] || 0) + 1;
        }
        return acc;
      },
      {}
    );

    // Find professional with most appointments
    let topProfessional: { id: string; name: string; count: number } | null =
      null;
    let maxAppointments = 0;

    interface ProfessionalData {
      professional_id: string | number;
      professionals: {
        id?: string | number;
        name?: string;
      } | null;
    }

    if (professionalAppointments && topProfessionalData) {
      Object.entries(professionalAppointments).forEach(
        ([professionalId, count]) => {
          if (count > maxAppointments) {
            maxAppointments = count;
            // Find the professional data
            const professional = topProfessionalData.find(
              (p: ProfessionalData) =>
                String(p.professional_id) === professionalId
            );
            if (professional?.professionals) {
              topProfessional = {
                id: professionalId,
                name: String(professional.professionals.name || "Desconhecido"),
                count: count,
              };
            }
          }
        }
      );
    }

    // Get top client (with most appointments)
    const { data: topClientData } = await supabase
      .from("appointments")
      .select(
        `
        client_id,
        clients:client_id (id, name)
      `
      )
      .eq("business_id", businessId)
      .gte("start_time", startDateStr)
      .lte("start_time", endDateStr);

    // Count appointments per client
    const clientAppointments = topClientData?.reduce(
      (acc: Record<string, number>, appointment: any) => {
        const clientId = appointment.client_id?.toString();
        if (clientId) {
          acc[clientId] = (acc[clientId] || 0) + 1;
        }
        return acc;
      },
      {}
    );

    // Find client with most appointments
    let topClient: { id: string; name: string; count: number } | null = null;
    maxAppointments = 0;

    interface ClientData {
      client_id: string | number;
      clients: {
        id?: string | number;
        name?: string;
      } | null;
    }

    if (clientAppointments && topClientData) {
      Object.entries(clientAppointments).forEach(([clientId, count]) => {
        if (count > maxAppointments) {
          maxAppointments = count;
          // Find the client data
          const client = topClientData.find(
            (c: ClientData) => String(c.client_id) === clientId
          );
          if (client?.clients) {
            topClient = {
              id: clientId,
              name: String(client.clients.name || "Desconhecido"),
              count: count,
            };
          }
        }
      });
    }

    // After calculating topProfessional, add this code to get top 5 professionals
    const topProfessionals = professionalAppointments
      ? Object.entries(professionalAppointments)
          .map(([professionalId, count]) => {
            const professional = topProfessionalData?.find(
              (p) => p.professional_id?.toString() === professionalId
            );
            const name = professional?.professionals?.name || "Desconhecido";
            return { id: professionalId, name, count };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      : [];

    // After calculating topClient, add this code to get top 5 clients
    const topClients = clientAppointments
      ? Object.entries(clientAppointments)
          .map(([clientId, count]) => {
            const client = topClientData?.find(
              (c) => c.client_id?.toString() === clientId
            );
            const name = client?.clients?.name || "Desconhecido";
            return { id: clientId, name, count };
          })
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)
      : [];

    // Prepare response with charts data and new professional/client info
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
        professionals: {
          count: professionalsCount || 0,
        },
        topProfessional,
        topClient,
      },
      recentAppointments: recentAppointments || [],
      professionals: professionals,
      charts: {
        dailyStats: dailyStatsArray,
        topServices,
        topProfessionals,
        topClients,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error in GET dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};
