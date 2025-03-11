import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";
import { invalidateCacheTags, CacheTags } from "@/lib/cache-utils";
import {
  createSimpleCachedHandler,
  invalidateSimpleCache,
} from "@/lib/simple-cache";

// Handler original para GET
async function getAppointmentsHandler(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Base query
    let query = supabase
      .from("appointments")
      .select(
        `
      *,
      clients:client_id (id, name, phone),
      professionals:professional_id (id, name),
      services:service_id (id, name, duration, price)
    `
      )
      .eq("business_id", businessId);

    // Apply filters if provided
    if (phone) {
      // Join with clients table to filter by phone
      query = supabase
        .from("appointments")
        .select(
          `
        *,
        professionals:professional_id (id, name),
        services:service_id (id, name, duration, price),
        clients:client_id (id, name, phone)
      `
        )
        .eq("business_id", businessId)
        .eq("clients.phone", phone);
    }

    // Execute query
    const { data, error } = await query.order("start_time", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching appointments:", error);
      return NextResponse.json(
        { error: "Failed to fetch appointments" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in appointments API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Aplicando cache simples ao handler GET
export const GET = createSimpleCachedHandler(getAppointmentsHandler, {
  // Cache por 5 minutos
  ttl: 300,
  // Função personalizada para gerar a chave de cache
  getCacheKey: (request) => {
    try {
      const url = new URL(request.url);
      const phone = url.searchParams.get("phone") || "";
      const businessId = request.headers.get("x-business-id") || "";

      // Criar uma chave de cache baseada no ID do negócio e filtros
      return `appointments-${businessId}-phone-${phone}`;
    } catch (error) {
      console.error("Error creating cache key:", error);
      return "appointments-default";
    }
  },
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    // Validate required fields
    const requiredFields = ["start_time", "professional_id", "service_id"];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Buscar ou criar cliente
    let clientId = body.client_id;
    if (!clientId) {
      // Primeiro tenta buscar o cliente pelo telefone
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", body.client_phone)
        .eq("business_id", businessId)
        .single();

      if (existingClient) {
        clientId = existingClient.id;
      } else {
        // Se não encontrar, cria um novo cliente
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert([
            {
              name: body.client_name,
              phone: body.client_phone,
              business_id: businessId,
            },
          ])
          .select()
          .single();

        if (clientError) {
          console.error("Error creating client:", clientError);
          return NextResponse.json(
            { error: "Failed to create client" },
            { status: 500 }
          );
        }

        clientId = newClient.id;
      }
    }

    // Calculate end_time based on service duration
    const { data: service } = await supabase
      .from("services")
      .select("duration")
      .eq("id", body.service_id)
      .single();

    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const startTime = new Date(body.start_time);
    const endTime = new Date(startTime.getTime() + service.duration * 60000);

    // Create appointment
    const { data, error } = await supabase
      .from("appointments")
      .insert([
        {
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          professional_id: body.professional_id,
          service_id: body.service_id,
          client_id: clientId,
          business_id: businessId,
          status: "scheduled",
          notes: body.notes || "",
        },
      ])
      .select();

    if (error) {
      console.error("Error creating appointment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // After successfully creating an appointment, invalidate related caches
    try {
      invalidateCacheTags([CacheTags.APPOINTMENTS, CacheTags.DASHBOARD]);

      // Invalidar cache simples
      const businessIdStr = businessId.toString();
      invalidateSimpleCache(`appointments-${businessIdStr}-phone-`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
      // Continuar mesmo se a invalidação falhar
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error in appointments API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    if (!body.id) {
      return NextResponse.json(
        { error: "Missing appointment ID" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Only include fields that are provided
    if (body.start_time) {
      updateData.start_time = body.start_time;

      // If start_time is updated, recalculate end_time based on service duration
      if (body.service_id) {
        const { data: service } = await supabase
          .from("services")
          .select("duration")
          .eq("id", body.service_id)
          .single();

        if (!service) {
          return NextResponse.json(
            { error: "Service not found" },
            { status: 404 }
          );
        }

        const startTime = new Date(body.start_time);
        updateData.end_time = new Date(
          startTime.getTime() + service.duration * 60000
        ).toISOString();
      }
    }

    // Add other fields if provided
    if (body.professional_id) updateData.professional_id = body.professional_id;
    if (body.service_id) updateData.service_id = body.service_id;
    if (body.client_id) updateData.client_id = body.client_id;
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Update appointment
    const { error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", body.id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error updating appointment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // After successfully updating an appointment, invalidate related caches
    try {
      invalidateCacheTags([CacheTags.APPOINTMENTS, CacheTags.DASHBOARD]);

      // Invalidar cache simples
      const businessIdStr = businessId.toString();
      invalidateSimpleCache(`appointments-${businessIdStr}-phone-`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
      // Continuar mesmo se a invalidação falhar
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating appointment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Get appointment ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing appointment ID" },
        { status: 400 }
      );
    }

    // Delete appointment
    const { error } = await supabase
      .from("appointments")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error deleting appointment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // After successfully deleting an appointment, invalidate related caches
    try {
      invalidateCacheTags([CacheTags.APPOINTMENTS, CacheTags.DASHBOARD]);

      // Invalidar cache simples
      const businessIdStr = businessId.toString();
      invalidateSimpleCache(`appointments-${businessIdStr}-phone-`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
      // Continuar mesmo se a invalidação falhar
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
