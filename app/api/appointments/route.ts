import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";
import { format } from "date-fns";
import { NotificationService } from "@/lib/services/notification-service";

// Handler GET sem cache
export const GET = async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const businessIdFromQuery = searchParams.get("business_id");
    const headerBusinessId = request.headers.get("X-Business-ID");

    let businessId: string | null = null;

    // If business_id is provided in query or header, use it directly
    if (businessIdFromQuery) {
      businessId = businessIdFromQuery;
    } else if (headerBusinessId) {
      businessId = headerBusinessId;
    } else {
      // Otherwise check auth and get business_id from session
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get the business_id using our utility function
      businessId = await getBusinessId(request);
    }

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
      // Filter by client phone
      query = query.eq("clients.phone", phone);
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
};

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Parse request body first
    const body = await request.json();
    const headerBusinessId = request.headers.get("X-Business-ID");

    // If business_id is provided in body or header, use it directly
    let businessId = body.business_id;

    if (!businessId && headerBusinessId) {
      businessId = headerBusinessId;
    }

    // Only check authentication if business_id is not provided in body or header
    if (!businessId) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get the business_id using our utility function
      businessId = await getBusinessId(request);
      if (!businessId) {
        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 }
        );
      }
    }

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

    // Verificar se há conflito com outros agendamentos do mesmo profissional
    const { data: existingAppointments, error: conflictError } = await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("professional_id", body.professional_id)
      .eq("business_id", businessId)
      .gte("start_time", format(startTime, "yyyy-MM-dd") + "T00:00:00")
      .lt("start_time", format(startTime, "yyyy-MM-dd") + "T23:59:59");

    if (conflictError) {
      console.error("Error checking for conflicts:", conflictError);
      return NextResponse.json(
        { error: "Failed to check appointment conflicts" },
        { status: 500 }
      );
    }

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

    // Send WhatsApp notification if enabled
    try {
      const notificationService = new NotificationService();

      // Get notification preferences
      const preferences = await notificationService.getNotificationPreferences(
        businessId
      );

      // Send confirmation if enabled
      if (preferences && preferences.appointment_confirmation) {
        await notificationService.sendAppointmentConfirmation(
          businessId,
          data[0]
        );
      }
    } catch (notificationError) {
      // Log but don't fail the appointment creation if notification fails
      console.error(
        "Error sending appointment notification:",
        notificationError
      );
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

    // Get the current appointment data for notification
    const { data: currentAppointment } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", body.id)
      .single();

    if (!currentAppointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
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

        // Verificar se há conflito com outros agendamentos do mesmo profissional
        // Excluindo o próprio agendamento que está sendo atualizado
        const professionalId =
          body.professional_id ||
          (
            await supabase
              .from("appointments")
              .select("professional_id")
              .eq("id", body.id)
              .single()
          ).data?.professional_id;

        if (professionalId) {
          const { data: existingAppointments, error: conflictError } =
            await supabase
              .from("appointments")
              .select("start_time, end_time")
              .eq("professional_id", professionalId)
              .eq("business_id", businessId)
              .neq("id", body.id) // Excluir o próprio agendamento
              .gte("start_time", format(startTime, "yyyy-MM-dd") + "T00:00:00")
              .lt("start_time", format(startTime, "yyyy-MM-dd") + "T23:59:59");

          if (conflictError) {
            console.error("Error checking for conflicts:", conflictError);
            return NextResponse.json(
              { error: "Failed to check appointment conflicts" },
              { status: 500 }
            );
          }

          const endTime = new Date(updateData.end_time);

          // Verificar se há sobreposição com agendamentos existentes
          const hasConflict = existingAppointments.some((appointment) => {
            const appointmentStart = new Date(appointment.start_time);
            const appointmentEnd = new Date(appointment.end_time);

            return (
              (startTime < appointmentEnd && endTime > appointmentStart) ||
              startTime.getTime() === appointmentStart.getTime() ||
              endTime.getTime() === appointmentEnd.getTime()
            );
          });

          if (hasConflict) {
            return NextResponse.json(
              { error: "Este horário já está ocupado para este profissional" },
              { status: 409 }
            );
          }
        }
      }
    }

    // Add other fields if provided
    if (body.professional_id) updateData.professional_id = body.professional_id;
    if (body.service_id) updateData.service_id = body.service_id;
    if (body.client_id) updateData.client_id = body.client_id;
    if (body.status) updateData.status = body.status;
    if (body.notes !== undefined) updateData.notes = body.notes;

    // Update appointment
    const { data: updatedAppointment, error } = await supabase
      .from("appointments")
      .update(updateData)
      .eq("id", body.id)
      .eq("business_id", businessId)
      .select();

    if (error) {
      console.error("Error updating appointment:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send WhatsApp notification if enabled
    try {
      const notificationService = new NotificationService();

      // Get notification preferences
      const preferences = await notificationService.getNotificationPreferences(
        businessId
      );

      // Send update notification if enabled and there are changes that affect the client
      if (
        preferences &&
        preferences.appointment_update &&
        updatedAppointment &&
        updatedAppointment.length > 0
      ) {
        // Sempre enviar notificação, sem verificar se a mudança é relevante
        await notificationService.sendAppointmentUpdate(
          businessId,
          updatedAppointment[0],
          {
            start_time: currentAppointment.start_time,
            professional_id: currentAppointment.professional_id,
            service_id: currentAppointment.service_id,
          }
        );
      }
    } catch (notificationError) {
      // Log but don't fail the appointment update if notification fails
      console.error(
        "Error sending appointment update notification:",
        notificationError
      );
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

    // Get the appointment data for the cancellation notification
    const { data: appointment } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", id)
      .eq("business_id", businessId)
      .single();

    if (!appointment) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
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

    // Send WhatsApp notification if enabled
    try {
      const notificationService = new NotificationService();

      // Get notification preferences
      const preferences = await notificationService.getNotificationPreferences(
        businessId
      );

      // Send cancellation notification if enabled
      if (preferences && preferences.appointment_cancellation) {
        await notificationService.sendAppointmentCancellation(
          businessId,
          appointment
        );
      }
    } catch (notificationError) {
      // Log but don't fail the appointment deletion if notification fails
      console.error(
        "Error sending appointment cancellation notification:",
        notificationError
      );
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
