import { SupabaseClient } from "@supabase/supabase-js";
import { findProfessionalByName, findServiceByName } from "./search-utils";
import {
  BUSINESS_HOURS,
  getBusinessDayLimits,
  hasAppointmentConflict,
  isWithinBusinessHours,
} from "./date-utils";

// Tipos de cache que podem ser invalidados
export enum CacheTags {
  APPOINTMENTS = "appointments",
  DASHBOARD = "dashboard",
}

// Funções de cache simplificadas para o exemplo
function invalidateCacheTags(tags: CacheTags[]) {
  console.log("Invalidating cache tags:", tags);
}

function invalidateSimpleCache(key: string) {
  console.log("Invalidating simple cache for key:", key);
}

export interface ToolUse {
  name: string;
  input: any;
  toolUseId: string;
}

export interface ToolResult {
  toolUseId: string;
  content: Array<{
    json?: any;
    text?: string;
  }>;
  status: "success" | "error";
}

export interface ServiceResult {
  found: boolean;
  service: {
    id: string;
    name: string;
    duration: number;
  } | null;
  suggestions: Array<{
    id: string;
    name: string;
    duration: number;
  }> | null;
}

export async function handleListServices(
  supabase: SupabaseClient,
  businessId: string
) {
  const { data: services, error: servicesError } = await supabase
    .from("services")
    .select("id, name, duration, price")
    .eq("business_id", businessId)
    .order("name");

  if (servicesError) {
    throw new Error(`Erro ao buscar serviços: ${servicesError.message}`);
  }

  return {
    json: {
      services: services || [],
    },
  };
}

export async function handleListProfessionals(
  supabase: SupabaseClient,
  businessId: string
) {
  const { data: professionals, error: professionalsError } = await supabase
    .from("professionals")
    .select("id, name")
    .eq("business_id", businessId)
    .order("name");

  if (professionalsError) {
    throw new Error(
      `Erro ao buscar profissionais: ${professionalsError.message}`
    );
  }

  return {
    json: {
      professionals: professionals || [],
    },
  };
}

export async function handleCheckAvailability(
  supabase: SupabaseClient,
  businessId: string,
  input: {
    professionalId?: string;
    date: string;
    serviceId?: string;
  }
) {
  let serviceDuration = 30; // default duration
  let professionalIdForAvailability = input.professionalId;
  let professionalName = input.professionalId;
  let serviceIdForAvailability = input.serviceId;
  let serviceName = input.serviceId;
  let serviceSuggestions = null;

  // Validate professionalId if provided
  if (input.professionalId) {
    const professionalData = await findProfessionalByName(
      supabase,
      input.professionalId,
      businessId
    );

    if (!professionalData) {
      throw new Error(`Profissional não encontrado: ${input.professionalId}`);
    }

    professionalIdForAvailability = professionalData.id;
    professionalName = professionalData.name;
  }

  // Validate serviceId if provided
  if (input.serviceId) {
    const serviceResult = await findServiceByName(
      supabase,
      input.serviceId,
      businessId
    );

    if (!serviceResult.found || !serviceResult.service) {
      return {
        json: {
          available: false,
          date: input.date,
          serviceNotFound: true,
          searchTerm: input.serviceId,
          suggestions: serviceResult.suggestions || [],
          message: `Serviço "${input.serviceId}" não encontrado. Aqui estão algumas opções disponíveis.`,
        },
      };
    }

    serviceIdForAvailability = serviceResult.service.id;
    serviceName = serviceResult.service.name;
    serviceSuggestions = serviceResult.suggestions;
    serviceDuration = serviceResult.service.duration || serviceDuration;
  }

  // Get existing appointments
  const { data: existingAppointments, error: appointmentsError } =
    await supabase
      .from("appointments")
      .select("start_time, end_time")
      .eq("business_id", businessId)
      .eq("professional_id", professionalIdForAvailability)
      .gte("start_time", `${input.date}T00:00:00`)
      .lt("start_time", `${input.date}T23:59:59`)
      .order("start_time");

  if (appointmentsError) {
    throw new Error(
      `Erro ao verificar disponibilidade: ${appointmentsError.message}`
    );
  }

  const { dayStart, dayEnd } = getBusinessDayLimits(input.date);

  // Generate available slots
  const availableSlots: string[] = [];
  let currentSlot = new Date(dayStart);

  while (currentSlot < dayEnd) {
    const slotEnd = new Date(currentSlot);
    slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

    if (
      slotEnd <= dayEnd &&
      !hasAppointmentConflict(currentSlot, slotEnd, existingAppointments || [])
    ) {
      availableSlots.push(currentSlot.toTimeString().substring(0, 5));
    }

    currentSlot.setMinutes(currentSlot.getMinutes() + BUSINESS_HOURS.interval);
  }

  return {
    json: {
      available: availableSlots.length > 0,
      date: input.date,
      slots: availableSlots,
      professional: input.professionalId
        ? {
            id: professionalIdForAvailability,
            name: professionalName,
            availableSlots: availableSlots,
          }
        : null,
      service: input.serviceId
        ? {
            id: serviceIdForAvailability,
            name: serviceName,
            duration: serviceDuration,
            suggestions: serviceSuggestions,
          }
        : null,
    },
  };
}

export async function handleValidateAppointment(
  supabase: SupabaseClient,
  businessId: string,
  input: {
    serviceName: string;
    professionalName?: string;
    date?: string;
    time: string;
  }
) {
  // Use today's date if not provided
  const date = input.date || new Date().toISOString().split("T")[0];

  const validationResults = {
    service: {
      valid: false,
      data: null as any,
      suggestions: [] as any[],
    },
    professional: {
      valid: false,
      data: null as any,
      suggestions: [] as any[],
    },
    availability: { valid: false, availableSlots: [] as string[] },
  };

  let serviceDuration = 30;

  // 1. Validate service
  if (input.serviceName) {
    const serviceResult = await findServiceByName(
      supabase,
      input.serviceName,
      businessId
    );

    if (serviceResult.found && serviceResult.service) {
      validationResults.service.valid = true;
      validationResults.service.data = serviceResult.service;
      serviceDuration = serviceResult.service.duration || serviceDuration;
    } else {
      validationResults.service.suggestions = serviceResult.suggestions || [];
    }
  }

  // 2. Validate professional
  if (input.professionalName) {
    const professionalData = await findProfessionalByName(
      supabase,
      input.professionalName,
      businessId
    );

    if (professionalData) {
      validationResults.professional.valid = true;
      validationResults.professional.data = professionalData;
    } else {
      const { data: allProfessionals } = await supabase
        .from("professionals")
        .select("id, name")
        .eq("business_id", businessId)
        .order("name")
        .limit(5);

      validationResults.professional.suggestions = allProfessionals || [];
    }
  }

  // 3. Check availability
  if (
    date &&
    input.time &&
    validationResults.professional.valid &&
    validationResults.service.valid
  ) {
    const professionalId = validationResults.professional.data?.id;

    if (professionalId) {
      const { data: existingAppointments } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("business_id", businessId)
        .eq("professional_id", professionalId)
        .gte("start_time", `${date}T00:00:00`)
        .lt("start_time", `${date}T23:59:59`)
        .order("start_time");

      const requestedTime = new Date(`${date}T${input.time}`);
      const requestedEndTime = new Date(
        requestedTime.getTime() + serviceDuration * 60000
      );

      if (
        isWithinBusinessHours(requestedTime, requestedEndTime) &&
        !hasAppointmentConflict(
          requestedTime,
          requestedEndTime,
          existingAppointments || []
        )
      ) {
        validationResults.availability.valid = true;
      }

      // Generate available slots for suggestions
      const { dayStart, dayEnd } = getBusinessDayLimits(date);
      let currentSlot = new Date(dayStart);

      while (currentSlot < dayEnd) {
        const slotEnd = new Date(currentSlot);
        slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

        if (
          slotEnd <= dayEnd &&
          !hasAppointmentConflict(
            currentSlot,
            slotEnd,
            existingAppointments || []
          )
        ) {
          validationResults.availability.availableSlots.push(
            currentSlot.toTimeString().substring(0, 5)
          );
        }

        currentSlot.setMinutes(
          currentSlot.getMinutes() + BUSINESS_HOURS.interval
        );
      }
    }
  }

  const isFullyValid =
    validationResults.service.valid &&
    validationResults.professional.valid &&
    validationResults.availability.valid;

  let validationMessage =
    "Não foi possível validar o agendamento. Verifique os detalhes.";
  if (
    isFullyValid &&
    validationResults.service.data &&
    validationResults.professional.data
  ) {
    validationMessage = `Agendamento válido para ${validationResults.service.data.name} com ${validationResults.professional.data.name} em ${date} às ${input.time}`;
  }

  return {
    json: {
      valid: isFullyValid,
      service: validationResults.service,
      professional: validationResults.professional,
      availability: validationResults.availability,
      date: date,
      time: input.time,
      message: validationMessage,
    },
  };
}

export async function handleCreateAppointment(
  supabase: SupabaseClient,
  businessId: string,
  input: {
    serviceId: string;
    professionalId: string;
    date?: string;
    time: string;
    clientName: string;
    clientPhone: string;
    notes?: string;
  }
) {
  // Use today's date if not provided
  const date = input.date || new Date().toISOString().split("T")[0];

  let serviceId = input.serviceId;
  let professionalId = input.professionalId;
  let serviceName = input.serviceId;
  let professionalName = input.professionalId;
  let serviceDuration = 30;

  // Validate service
  const serviceResult = await findServiceByName(
    supabase,
    input.serviceId,
    businessId
  );

  // Check if service was found or if there are close matches
  if (!serviceResult.found || !serviceResult.service) {
    // If there are suggestions and one exactly matches the input, use that instead
    const exactMatch = serviceResult.suggestions?.find(
      (s) => s.name.toLowerCase() === input.serviceId.toLowerCase()
    );

    if (exactMatch) {
      serviceId = exactMatch.id;
      serviceName = exactMatch.name;
      serviceDuration = exactMatch.duration || serviceDuration;
    } else {
      throw new Error(
        `Serviço não encontrado: ${
          input.serviceId
        }. Por favor, escolha entre: ${
          serviceResult.suggestions?.map((s) => s.name).join(", ") || ""
        }`
      );
    }
  } else {
    serviceId = serviceResult.service.id;
    serviceName = serviceResult.service.name;
    serviceDuration = serviceResult.service.duration || serviceDuration;
  }

  // Validate professional
  const professionalData = await findProfessionalByName(
    supabase,
    input.professionalId,
    businessId
  );
  if (!professionalData) {
    throw new Error(`Profissional não encontrado: ${input.professionalId}`);
  }
  professionalId = professionalData.id;
  professionalName = professionalData.name;

  // Check if client exists or create new
  let clientId;
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("phone", input.clientPhone)
    .eq("business_id", businessId)
    .single();

  if (existingClient) {
    clientId = existingClient.id;
    await supabase
      .from("clients")
      .update({ name: input.clientName })
      .eq("id", clientId);
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from("clients")
      .insert({
        name: input.clientName,
        phone: input.clientPhone,
        business_id: businessId,
      })
      .select("id")
      .single();

    if (clientError) {
      throw new Error(`Erro ao criar cliente: ${clientError.message}`);
    }
    clientId = newClient.id;
  }

  // Calculate appointment times
  const startTime = new Date(`${date}T${input.time}`);
  const endTime = new Date(startTime.getTime() + serviceDuration * 60000);

  // Create appointment
  const { data: appointment, error: createError } = await supabase
    .from("appointments")
    .insert({
      business_id: businessId,
      service_id: serviceId,
      professional_id: professionalId,
      client_id: clientId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "scheduled",
      notes: input.notes || "",
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(`Erro ao criar agendamento: ${createError.message}`);
  }

  // Invalidate caches
  try {
    invalidateCacheTags([CacheTags.APPOINTMENTS, CacheTags.DASHBOARD]);
    invalidateSimpleCache(`appointments-${businessId}-phone-`);
    invalidateSimpleCache(`dashboard-${businessId}-daily`);
    invalidateSimpleCache(`dashboard-${businessId}-weekly`);
    invalidateSimpleCache(`dashboard-${businessId}-monthly`);
  } catch (error) {
    console.error("Error invalidating cache:", error);
  }

  return {
    json: {
      success: true,
      appointment: {
        id: appointment.id,
        serviceId,
        serviceName,
        professionalId,
        professionalName,
        clientId,
        date: date,
        time: input.time,
        clientName: input.clientName,
        clientPhone: input.clientPhone,
      },
    },
  };
}

export async function handleToolCalls(
  toolUse: ToolUse,
  supabase: SupabaseClient,
  businessId: string
): Promise<ToolResult> {
  const { name, input, toolUseId } = toolUse;

  try {
    console.log(`🔧 Tool chamada: ${name}`, { input });

    let content;

    switch (name) {
      case "listServices":
        content = await handleListServices(supabase, businessId);
        break;

      case "listProfessionals":
        content = await handleListProfessionals(supabase, businessId);
        break;

      case "checkAvailability":
        content = await handleCheckAvailability(supabase, businessId, input);
        break;

      case "validateAppointment":
        content = await handleValidateAppointment(supabase, businessId, input);
        break;

      case "createAppointment":
        content = await handleCreateAppointment(supabase, businessId, input);
        break;

      default:
        throw new Error(`Ferramenta não reconhecida: ${name}`);
    }

    return {
      toolUseId,
      content: [content],
      status: "success" as const,
    };
  } catch (error) {
    console.error(`❌ Erro na execução da tool ${name}:`, error);
    return {
      toolUseId,
      content: [
        {
          text: error instanceof Error ? error.message : "Erro desconhecido",
        },
      ],
      status: "error" as const,
    };
  }
}
