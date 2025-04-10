// Tipos de cache que podem ser invalidados
export enum CacheTags {
  APPOINTMENTS = "appointments",
  DASHBOARD = "dashboard",
}

// São Paulo timezone offset is typically UTC-3
const SAO_PAULO_TIMEZONE = "America/Sao_Paulo";

// URL base para as requisições de API
function getBaseUrl() {
  // Durante o desenvolvimento, retornamos a URL local
  // Em produção, usamos a URL real do site
  return typeof window !== "undefined"
    ? "" // URL relativa no cliente
    : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"; // URL absoluta no servidor
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

export async function handleListServices(businessId: string) {
  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    // Construir URL para a API de serviços
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/services`;

    // Fazer requisição para a API
    const response = await fetch(url, {
      headers: {
        "X-Business-ID": businessIdStr,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar serviços: ${errorText}`);
    }

    const services = await response.json();

    return {
      json: {
        services,
      },
    };
  } catch (error) {
    throw new Error(
      `Erro ao buscar serviços: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handleListProfessionals(businessId: string) {
  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    // Construir URL para a API de profissionais
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/professionals`;

    // Fazer requisição para a API
    const response = await fetch(url, {
      headers: {
        "X-Business-ID": businessIdStr,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar profissionais: ${errorText}`);
    }

    const professionals = await response.json();

    return {
      json: {
        professionals,
      },
    };
  } catch (error) {
    throw new Error(
      `Erro ao buscar profissionais: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handleCheckAvailability(
  businessId: string,
  input: {
    professional_id?: string;
    date: string;
    service_id?: string;
  }
) {
  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    let professionalIdToUse = input.professional_id;

    // Verificar se professionalId parece ser um nome em vez de um UUID
    if (
      professionalIdToUse &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        professionalIdToUse
      )
    ) {
      console.log(
        `⚠️ Detectado nome de profissional em vez de ID: ${professionalIdToUse}. Tentando converter para ID...`
      );

      try {
        // Buscar o profissional pelo nome para obter o ID
        const baseUrl = getBaseUrl();
        const searchUrl = `${baseUrl}/api/professionals`;

        const response = await fetch(searchUrl, {
          headers: {
            "X-Business-ID": businessIdStr,
          },
        });

        if (response.ok) {
          const professionals = await response.json();
          const matchedProfessional = professionals.find(
            (p: any) =>
              p.name.toLowerCase() === professionalIdToUse?.toLowerCase()
          );

          if (matchedProfessional) {
            console.log(
              `✅ Profissional encontrado: ${matchedProfessional.name}, ID: ${matchedProfessional.id}`
            );
            professionalIdToUse = matchedProfessional.id;
          } else {
            console.log(
              `❌ Nenhum profissional encontrado com o nome: ${professionalIdToUse}`
            );
            throw new Error(
              `Profissional não encontrado: ${professionalIdToUse}`
            );
          }
        } else {
          throw new Error("Falha ao buscar profissionais");
        }
      } catch (error) {
        console.error("Erro ao tentar converter nome para ID:", error);
        throw new Error(
          `Erro ao buscar profissional por nome: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Construir URL para a API de disponibilidade
    const queryParams = new URLSearchParams();
    if (professionalIdToUse)
      queryParams.append("professional_id", professionalIdToUse);
    if (input.date) queryParams.append("date", input.date);
    if (input.service_id) queryParams.append("service_id", input.service_id);

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/availability?${queryParams.toString()}`;

    console.log(`🔍 Verificando disponibilidade usando URL: ${url}`);

    // Fazer requisição para a API
    const response = await fetch(url, {
      headers: {
        "X-Business-ID": businessIdStr,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao verificar disponibilidade: ${errorText}`);
    }

    const availability = await response.json();

    return {
      json: availability,
    };
  } catch (error) {
    throw new Error(
      `Erro ao verificar disponibilidade: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handleValidateAppointment(
  businessId: string,
  input: {
    service_name: string;
    professional_name?: string;
    date?: string;
    time: string;
    client_name?: string;
    client_phone?: string;
  }
) {
  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    const baseUrl = getBaseUrl();

    // Primeiro, vamos validar o serviço usando a API de serviços
    const serviceQueryParams = new URLSearchParams();
    serviceQueryParams.append("name", input.service_name);

    const serviceUrl = `${baseUrl}/api/services?${serviceQueryParams.toString()}`;

    const serviceResponse = await fetch(serviceUrl, {
      headers: {
        "X-Business-ID": businessIdStr,
      },
    });

    if (!serviceResponse.ok) {
      throw new Error(
        `Erro ao validar serviço: ${await serviceResponse.text()}`
      );
    }

    const services = await serviceResponse.json();

    // Depois, validar o profissional se fornecido
    let professional = null;
    if (input.professional_name) {
      const professionalQueryParams = new URLSearchParams();
      professionalQueryParams.append("name", input.professional_name);

      const professionalUrl = `${baseUrl}/api/professionals?${professionalQueryParams.toString()}`;

      const professionalResponse = await fetch(professionalUrl, {
        headers: {
          "X-Business-ID": businessIdStr,
        },
      });

      if (professionalResponse.ok) {
        const professionals = await professionalResponse.json();
        if (professionals && professionals.length > 0) {
          professional = professionals[0];
        }
      }
    }

    // Validar disponibilidade se serviço e profissional forem encontrados
    const service: { id: string; name: string; duration: number } | null =
      services.find(
        (s: any) => s.name.toLowerCase() === input.service_name.toLowerCase()
      ) || null;

    let availability = { valid: false, availableSlots: [] };

    if (service && professional && input.date) {
      const availabilityQueryParams = new URLSearchParams();
      availabilityQueryParams.append("professional_id", professional.id);
      availabilityQueryParams.append("date", input.date);
      availabilityQueryParams.append(
        "service_duration",
        service.duration.toString()
      );

      const availabilityUrl = `${baseUrl}/api/availability?${availabilityQueryParams.toString()}`;

      const availabilityResponse = await fetch(availabilityUrl, {
        headers: {
          "X-Business-ID": businessIdStr,
        },
      });

      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json();
        const availableSlots = availabilityData.available_slots || [];
        availability = {
          valid: availableSlots.includes(input.time),
          availableSlots,
        };
      }
    }

    // Validar cliente se nome ou telefone fornecidos
    let client: {
      valid: boolean;
      data: any;
      suggestions: any[];
      multipleMatches: boolean;
      message: string;
    } = {
      valid: false,
      data: null,
      suggestions: [],
      multipleMatches: false,
      message: "",
    };

    if (input.client_name || input.client_phone) {
      const clientQueryParams = new URLSearchParams();
      if (input.client_name)
        clientQueryParams.append("name", input.client_name);
      if (input.client_phone)
        clientQueryParams.append("phone", input.client_phone);

      const clientUrl = `${baseUrl}/api/clients?${clientQueryParams.toString()}`;

      const clientResponse = await fetch(clientUrl, {
        headers: {
          "X-Business-ID": businessIdStr,
        },
      });

      if (clientResponse.ok) {
        const clients = await clientResponse.json();

        if (clients && clients.length > 0) {
          if (clients.length === 1) {
            client = {
              valid: true,
              data: clients[0],
              suggestions: [],
              multipleMatches: false,
              message: `Cliente encontrado: ${clients[0].name} (${clients[0].phone})`,
            };
          } else {
            client = {
              valid: false,
              data: null,
              suggestions: clients,
              multipleMatches: true,
              message: `Encontramos ${clients.length} clientes com dados similares.`,
            };
          }
        } else {
          client.message =
            "Nenhum cliente encontrado. Um novo cliente será criado durante o agendamento.";
        }
      }
    }

    const isFullyValid = service && professional && availability.valid;

    let validationMessage =
      "Não foi possível validar o agendamento. Verifique os detalhes.";
    if (isFullyValid) {
      validationMessage = `Agendamento válido para ${service.name} com ${
        professional.name
      } em ${input.date || "hoje"} às ${input.time}`;

      if (client.valid && client.data) {
        validationMessage += ` para ${client.data.name}`;
      }
    }

    return {
      json: {
        valid: isFullyValid,
        service: {
          valid: !!service,
          data: service || null,
          suggestions: services
            .filter(
              (s: any) =>
                s.name.toLowerCase() !== input.service_name.toLowerCase()
            )
            .slice(0, 5),
        },
        professional: {
          valid: !!professional,
          data: professional,
          suggestions: [],
        },
        availability,
        client,
        date: input.date || new Date().toISOString().split("T")[0],
        time: input.time,
        message: validationMessage,
      },
    };
  } catch (error) {
    throw new Error(
      `Erro ao validar agendamento: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handleCreateAppointment(
  businessId: string,
  input: {
    service_id: string;
    professional_id: string;
    date?: string;
    time: string;
    client_name: string;
    client_phone: string;
    notes?: string;
  }
) {
  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    // Verificar e converter serviceId se for um nome em vez de UUID
    let serviceIdToUse = input.service_id;
    if (
      serviceIdToUse &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        serviceIdToUse
      )
    ) {
      console.log(
        `⚠️ Detectado nome de serviço em vez de ID: ${serviceIdToUse}. Tentando converter para ID...`
      );

      try {
        const baseUrl = getBaseUrl();
        const searchUrl = `${baseUrl}/api/services`;

        const response = await fetch(searchUrl, {
          headers: {
            "X-Business-ID": businessIdStr,
          },
        });

        if (response.ok) {
          const services = await response.json();
          const matchedService = services.find(
            (s: any) => s.name.toLowerCase() === serviceIdToUse.toLowerCase()
          );

          if (matchedService) {
            console.log(
              `✅ Serviço encontrado: ${matchedService.name}, ID: ${matchedService.id}`
            );
            serviceIdToUse = matchedService.id;
          } else {
            console.log(
              `❌ Nenhum serviço encontrado com o nome: ${serviceIdToUse}`
            );
            throw new Error(`Serviço não encontrado: ${serviceIdToUse}`);
          }
        } else {
          throw new Error("Falha ao buscar serviços");
        }
      } catch (error) {
        console.error(
          "Erro ao tentar converter nome do serviço para ID:",
          error
        );
        throw new Error(
          `Erro ao buscar serviço por nome: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Verificar e converter professionalId se for um nome em vez de UUID
    let professionalIdToUse = input.professional_id;
    if (
      professionalIdToUse &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        professionalIdToUse
      )
    ) {
      console.log(
        `⚠️ Detectado nome de profissional em vez de ID: ${professionalIdToUse}. Tentando converter para ID...`
      );

      try {
        const baseUrl = getBaseUrl();
        const searchUrl = `${baseUrl}/api/professionals`;

        const response = await fetch(searchUrl, {
          headers: {
            "X-Business-ID": businessIdStr,
          },
        });

        if (response.ok) {
          const professionals = await response.json();
          const matchedProfessional = professionals.find(
            (p: any) =>
              p.name.toLowerCase() === professionalIdToUse.toLowerCase()
          );

          if (matchedProfessional) {
            console.log(
              `✅ Profissional encontrado: ${matchedProfessional.name}, ID: ${matchedProfessional.id}`
            );
            professionalIdToUse = matchedProfessional.id;
          } else {
            console.log(
              `❌ Nenhum profissional encontrado com o nome: ${professionalIdToUse}`
            );
            throw new Error(
              `Profissional não encontrado: ${professionalIdToUse}`
            );
          }
        } else {
          throw new Error("Falha ao buscar profissionais");
        }
      } catch (error) {
        console.error("Erro ao tentar converter nome para ID:", error);
        throw new Error(
          `Erro ao buscar profissional por nome: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Validar nome do cliente
    if (!input.client_name || input.client_name.trim() === "") {
      throw new Error(
        "Nome do cliente é obrigatório para criar um agendamento"
      );
    }

    if (input.client_name.length < 3) {
      console.log(`⚠️ Nome do cliente muito curto: ${input.client_name}`);
      // Não vamos bloquear o agendamento por isso, mas logamos o aviso
    } else {
      console.log(`✅ Nome do cliente validado: ${input.client_name}`);
    }

    // Validar telefone do cliente
    let clientPhoneToUse = input.client_phone;
    if (
      !clientPhoneToUse ||
      clientPhoneToUse === "Não informado" ||
      clientPhoneToUse.trim() === ""
    ) {
      throw new Error(
        "Telefone do cliente é obrigatório para criar um agendamento"
      );
    }

    // Normalizar o telefone (remover caracteres não numéricos)
    clientPhoneToUse = clientPhoneToUse.replace(/\D/g, "");

    // Verificar se o telefone tem um número razoável de dígitos
    if (clientPhoneToUse.length < 10 || clientPhoneToUse.length > 15) {
      console.log(
        `⚠️ Formato de telefone potencialmente inválido: ${clientPhoneToUse} (${clientPhoneToUse.length} dígitos)`
      );
      // Não vamos bloquear o agendamento por isso, mas logamos o aviso
    } else {
      console.log(`✅ Telefone validado: ${clientPhoneToUse}`);
    }

    // Chamada para a API de agendamentos
    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/appointments`;

    console.log(
      `📝 Criando agendamento com: Serviço=${serviceIdToUse}, Profissional=${professionalIdToUse}, Data=${input.date}, Hora=${input.time}`
    );

    // Preparar dados para o body da requisição
    const appointmentData = {
      business_id: businessIdStr,
      service_id: serviceIdToUse,
      professional_id: professionalIdToUse,
      client_name: input.client_name,
      client_phone: clientPhoneToUse,
      start_time: `${input.date || new Date().toISOString().split("T")[0]}T${
        input.time
      }:00`,
      notes: input.notes || "",
    };

    console.log(`📝 Dados para criação de agendamento:`, appointmentData);

    // Enviar requisição POST para a API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Business-ID": businessIdStr,
      },
      body: JSON.stringify(appointmentData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao criar agendamento: ${errorText}`);
    }

    const appointment = await response.json();

    // Invalidar caches
    try {
      invalidateCacheTags([CacheTags.APPOINTMENTS, CacheTags.DASHBOARD]);
      invalidateSimpleCache(`appointments-${businessIdStr}-phone-`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
    }

    return {
      json: {
        success: true,
        appointment: {
          id: appointment.id,
          serviceId: appointment.service_id,
          serviceName: appointment.services?.name || input.service_id,
          professionalId: appointment.professional_id,
          professionalName:
            appointment.professionals?.name || input.professional_id,
          clientId: appointment.client_id,
          date: input.date || new Date().toISOString().split("T")[0],
          time: input.time,
          clientName: input.client_name,
          clientPhone: clientPhoneToUse,
        },
        clientConfirmation: "Cliente processado com sucesso",
      },
    };
  } catch (error) {
    throw new Error(
      `Erro ao criar agendamento: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handleListAppointmentsByPhone(
  businessId: string,
  input: {
    client_phone: string;
    future_only?: boolean;
  }
) {
  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    // Normalizar o telefone (remover caracteres não numéricos)
    const normalizedPhone = input.client_phone.replace(/\D/g, "");

    if (normalizedPhone.length < 8) {
      throw new Error("Número de telefone inválido. Forneça um número válido.");
    }

    // Construir URL para a API de agendamentos
    const queryParams = new URLSearchParams();
    queryParams.append("phone", normalizedPhone);

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/appointments?${queryParams.toString()}`;

    console.log(`🔍 Buscando agendamentos para o telefone: ${normalizedPhone}`);

    // Fazer requisição para a API
    const response = await fetch(url, {
      headers: {
        "X-Business-ID": businessIdStr,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar agendamentos: ${errorText}`);
    }

    let appointments = await response.json();

    // Filtrar apenas agendamentos futuros se solicitado
    if (input.future_only) {
      const now = new Date();
      appointments = appointments.filter((appointment: any) => {
        const appointmentDate = new Date(appointment.start_time);
        return appointmentDate > now;
      });

      // Ordenar por data (do mais próximo para o mais distante)
      appointments.sort((a: any, b: any) => {
        return (
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );
      });
    }

    // Formatar a resposta para ser mais amigável
    const formattedAppointments = appointments.map((appointment: any) => {
      const startTime = new Date(appointment.start_time);
      const formattedDate = startTime.toLocaleDateString("pt-BR");
      const formattedTime = startTime.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      });

      return {
        id: appointment.id,
        data: formattedDate,
        hora: formattedTime,
        servico: appointment.services?.name || "Serviço não especificado",
        profissional:
          appointment.professionals?.name || "Profissional não especificado",
        status: appointment.status || "agendado",
        cliente: appointment.clients?.name || "Cliente não especificado",
        telefone: appointment.clients?.phone || input.client_phone,
      };
    });

    return {
      json: {
        appointments: formattedAppointments,
        total: formattedAppointments.length,
      },
    };
  } catch (error) {
    throw new Error(
      `Erro ao buscar agendamentos: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handleCancelAppointment(
  businessId: string,
  input: {
    appointment_id: string;
    reason?: string;
  }
) {
  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    if (!input.appointment_id) {
      throw new Error("ID do agendamento é obrigatório para cancelamento");
    }

    // Construir URL para a API de cancelamento
    const queryParams = new URLSearchParams();
    queryParams.append("id", input.appointment_id);

    const baseUrl = getBaseUrl();
    const url = `${baseUrl}/api/appointments?${queryParams.toString()}`;

    console.log(`🗑️ Cancelando agendamento: ${input.appointment_id}`);

    // Fazer requisição DELETE para a API
    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        "X-Business-ID": businessIdStr,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao cancelar agendamento: ${errorText}`);
    }

    const result = await response.json();

    // Invalidar caches
    try {
      invalidateCacheTags([CacheTags.APPOINTMENTS, CacheTags.DASHBOARD]);
      invalidateSimpleCache(`appointments-${businessIdStr}-phone-`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
    }

    return {
      json: {
        success: true,
        message: "Agendamento cancelado com sucesso",
        reason: input.reason || "Cancelamento solicitado pelo cliente",
      },
    };
  } catch (error) {
    throw new Error(
      `Erro ao cancelar agendamento: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handleUpdateAppointment(
  businessId: string,
  input: {
    appointment_id: string;
    service_id?: string;
    professional_id?: string;
    date?: string;
    time?: string;
    notes?: string;
  }
) {
  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    if (!input.appointment_id) {
      throw new Error("ID do agendamento é obrigatório para atualização");
    }

    // Verificar se pelo menos um campo para atualização foi fornecido
    if (
      !input.service_id &&
      !input.professional_id &&
      !input.date &&
      !input.time &&
      !input.notes
    ) {
      throw new Error(
        "Pelo menos um campo para atualização deve ser fornecido"
      );
    }

    // Primeiro, buscar o agendamento atual para ter os dados completos
    const baseUrl = getBaseUrl();
    const getUrl = `${baseUrl}/api/appointments/${input.appointment_id}`;

    console.log(
      `🔍 Buscando dados atuais do agendamento: ${input.appointment_id}`
    );

    // Buscar agendamento atual
    const getResponse = await fetch(getUrl, {
      headers: {
        "X-Business-ID": businessIdStr,
      },
    });

    if (!getResponse.ok) {
      const errorText = await getResponse.text();
      throw new Error(`Erro ao buscar agendamento: ${errorText}`);
    }

    const currentAppointment = await getResponse.json();

    // Preparar dados para atualização
    const updateData: any = {};

    // Verificar e converter serviceId se for um nome em vez de UUID
    if (input.service_id) {
      let serviceIdToUse = input.service_id;
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          serviceIdToUse
        )
      ) {
        // Buscar o serviço pelo nome
        const servicesUrl = `${baseUrl}/api/services`;
        const servicesResponse = await fetch(servicesUrl, {
          headers: {
            "X-Business-ID": businessIdStr,
          },
        });

        if (servicesResponse.ok) {
          const services = await servicesResponse.json();
          const matchedService = services.find(
            (s: any) => s.name.toLowerCase() === serviceIdToUse.toLowerCase()
          );

          if (matchedService) {
            serviceIdToUse = matchedService.id;
          } else {
            throw new Error(`Serviço não encontrado: ${serviceIdToUse}`);
          }
        }
      }
      updateData.service_id = serviceIdToUse;
    }

    // Verificar e converter professionalId se for um nome em vez de UUID
    if (input.professional_id) {
      let professionalIdToUse = input.professional_id;
      if (
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          professionalIdToUse
        )
      ) {
        // Buscar o profissional pelo nome
        const professionalsUrl = `${baseUrl}/api/professionals`;
        const professionalsResponse = await fetch(professionalsUrl, {
          headers: {
            "X-Business-ID": businessIdStr,
          },
        });

        if (professionalsResponse.ok) {
          const professionals = await professionalsResponse.json();
          const matchedProfessional = professionals.find(
            (p: any) =>
              p.name.toLowerCase() === professionalIdToUse.toLowerCase()
          );

          if (matchedProfessional) {
            professionalIdToUse = matchedProfessional.id;
          } else {
            throw new Error(
              `Profissional não encontrado: ${professionalIdToUse}`
            );
          }
        }
      }
      updateData.professional_id = professionalIdToUse;
    }

    // Lidar com data e hora
    let startTime: Date | null = null;
    const dateToUse = input.date || currentAppointment.start_time.split("T")[0];

    if (input.time) {
      // Se um novo horário foi fornecido, atualizar o start_time
      startTime = new Date(`${dateToUse}T${input.time}:00`);
      updateData.start_time = startTime.toISOString();

      // Calcular end_time baseado na duração do serviço
      const serviceId = updateData.service_id || currentAppointment.service_id;
      const servicesUrl = `${baseUrl}/api/services/${serviceId}`;
      const servicesResponse = await fetch(servicesUrl, {
        headers: {
          "X-Business-ID": businessIdStr,
        },
      });

      if (servicesResponse.ok) {
        const service = await servicesResponse.json();
        const durationMinutes = service.duration || 60; // Default to 60 minutes if not specified

        const endTime = new Date(startTime.getTime() + durationMinutes * 60000);
        updateData.end_time = endTime.toISOString();
      } else {
        // Se não conseguir obter a duração, use o padrão de 1 hora
        const endTime = new Date(startTime.getTime() + 60 * 60000);
        updateData.end_time = endTime.toISOString();
      }
    } else if (input.date) {
      // Se só a data foi alterada mas não o horário
      const currentTime = currentAppointment.start_time
        .split("T")[1]
        .substring(0, 5);
      startTime = new Date(`${dateToUse}T${currentTime}:00`);
      updateData.start_time = startTime.toISOString();

      // Recalcular end_time mantendo a mesma duração
      const currentStartTime = new Date(currentAppointment.start_time);
      const currentEndTime = new Date(currentAppointment.end_time);
      const durationMs = currentEndTime.getTime() - currentStartTime.getTime();

      const endTime = new Date(startTime.getTime() + durationMs);
      updateData.end_time = endTime.toISOString();
    }

    // Incluir notas se fornecidas
    if (input.notes !== undefined) {
      updateData.notes = input.notes;
    }

    // Atualizar o agendamento
    const updateUrl = `${baseUrl}/api/appointments/${input.appointment_id}`;

    console.log(
      `✏️ Atualizando agendamento: ${input.appointment_id}`,
      updateData
    );

    const updateResponse = await fetch(updateUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Business-ID": businessIdStr,
      },
      body: JSON.stringify(updateData),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Erro ao atualizar agendamento: ${errorText}`);
    }

    const result = await updateResponse.json();

    // Invalidar caches
    try {
      invalidateCacheTags([CacheTags.APPOINTMENTS, CacheTags.DASHBOARD]);
      invalidateSimpleCache(`appointments-${businessIdStr}-phone-`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
    }

    // Formatar resposta com informações sobre o que foi atualizado
    const updates: string[] = [];
    if (input.service_id) updates.push("serviço");
    if (input.professional_id) updates.push("profissional");
    if (input.date || input.time) updates.push("data/horário");
    if (input.notes) updates.push("observações");

    return {
      json: {
        success: true,
        message: `Agendamento atualizado com sucesso (${updates.join(", ")})`,
        appointment_id: input.appointment_id,
      },
    };
  } catch (error) {
    throw new Error(
      `Erro ao atualizar agendamento: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export async function handleToolCalls(
  toolUse: ToolUse,
  businessId: string
): Promise<ToolResult> {
  const { name, input, toolUseId } = toolUse;

  try {
    // Garantir que businessId seja uma string
    const businessIdStr =
      typeof businessId === "object"
        ? (businessId as any).id || JSON.stringify(businessId)
        : String(businessId);

    console.log(`🔧 Tool chamada: ${name}`, {
      input,
      businessId: businessIdStr,
    });

    let content;

    switch (name) {
      case "listServices":
        content = await handleListServices(businessId);
        break;

      case "listProfessionals":
        content = await handleListProfessionals(businessId);
        break;

      case "checkAvailability":
        content = await handleCheckAvailability(businessId, input);
        break;

      case "validateAppointment":
        content = await handleValidateAppointment(businessId, input);
        break;

      case "createAppointment":
        content = await handleCreateAppointment(businessId, input);
        break;

      case "listAppointmentsByPhone":
        content = await handleListAppointmentsByPhone(businessId, input);
        break;

      case "cancelAppointment":
        content = await handleCancelAppointment(businessId, input);
        break;

      case "updateAppointment":
        content = await handleUpdateAppointment(businessId, input);
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
