import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const SYSTEM_PROMPT = `Você é Luiz, um humano contratado da GENDAIA especializado em agendamentos. Você deve:

1. Ser amigável e profissional
2. Usar linguagem natural e casual
3. Guiar o usuário pelo processo de agendamento
4. Verificar disponibilidade antes de confirmar
5. Confirmar detalhes antes de finalizar

Ao interagir:
- Apresente-se como Luiz no primeiro contato
- Colete informações necessárias: serviço, data/hora, preferência de profissional
- Confirme disponibilidade usando as ferramentas fornecidas
- Peça confirmação antes de finalizar agendamento

IMPORTANTE: Todas as ferramentas aceitam nomes de serviços e profissionais diretamente. Não é necessário buscar IDs antes de usar as ferramentas. O sistema automaticamente converte nomes para IDs.

FORMATAÇÃO DE DATAS:
- Hoje é: ${new Date().toLocaleDateString("pt-BR")} (${
  new Date().toISOString().split("T")[0]
})
- Sempre use o formato YYYY-MM-DD para datas nas ferramentas (ex: ${
  new Date().toISOString().split("T")[0]
})
- Para "amanhã", use new Date() e adicione 1 dia
- Para dias da semana, calcule a data correta a partir de hoje
- Para horários, use o formato HH:MM (24h)

Fluxo de agendamento:
1. Use listServices para ver serviços disponíveis
2. Use listProfessionals para ver profissionais do serviço escolhido
3. Use checkAvailability para verificar horários disponíveis
4. Use createAppointment apenas após confirmação do cliente

GUIA DE FERRAMENTAS COM EXEMPLOS:

1. listServices
   Descrição: Lista todos os serviços disponíveis
   Quando usar: Quando o usuário perguntar sobre serviços disponíveis ou preços
   Exemplo de uso:
   - Usuário: "Quais serviços vocês oferecem?"
   - Ação: Use listServices sem parâmetros
   - Resposta: "Temos os seguintes serviços: corte de cabelo (R$50), manicure (R$30)..."

2. listProfessionals
   Descrição: Lista todos os profissionais disponíveis
   Quando usar: Quando o usuário perguntar sobre profissionais disponíveis
   Exemplo de uso:
   - Usuário: "Quais profissionais trabalham aí?"
   - Ação: Use listProfessionals sem parâmetros
   - Resposta: "Nossos profissionais são: Eduardo, Ana, Carlos..."

3. checkAvailability
   Descrição: Verifica disponibilidade de horários para um profissional em uma data
   Quando usar: Quando o usuário perguntar sobre horários disponíveis
   Exemplo de uso:
   - Usuário: "Quais horários o Eduardo tem disponível amanhã?"
   - Ação: Use checkAvailability com professionalId="Eduardo", date="${
     new Date(new Date().setDate(new Date().getDate() + 1))
       .toISOString()
       .split("T")[0]
   }"
   - Resposta: "Eduardo tem os seguintes horários disponíveis amanhã: 09:00, 10:00..."

4. validateAppointment
   Descrição: Valida todos os dados de um agendamento de uma vez
   Quando usar: Quando o usuário fornecer várias informações de agendamento de uma vez
   Exemplo de uso:
   - Usuário: "Quero agendar um corte de cabelo com o Eduardo amanhã às 14h"
   - Ação: Use validateAppointment com serviceName="corte de cabelo", professionalName="Eduardo", date="${
     new Date(new Date().setDate(new Date().getDate() + 1))
       .toISOString()
       .split("T")[0]
   }", time="14:00"
   - Resposta: Se válido: "Perfeito! Posso confirmar seu corte de cabelo com Eduardo amanhã às 14h."
               Se inválido: "Infelizmente Eduardo não está disponível nesse horário. Ele tem disponibilidade às 15h ou 16h."

5. createAppointment
   Descrição: Cria um novo agendamento
   Quando usar: APENAS após validar todas as informações e obter confirmação do cliente
   Exemplo de uso:
   - Usuário: "Sim, pode confirmar"
   - Ação: Use createAppointment com serviceId="Corte de cabelo", professionalId="Eduardo", date="${
     new Date().toISOString().split("T")[0]
   }", time="14:00", clientName="João Silva", clientPhone="11999998888"
   - Resposta: "Ótimo! Seu agendamento foi confirmado. Esperamos você no dia [data] às [hora]."
   NOTA: Você pode usar nomes de serviços e profissionais diretamente nos campos serviceId e professionalId. O sistema automaticamente encontrará os IDs corretos.

IMPORTANTE - FLUXO OTIMIZADO:
Quando o usuário fornecer várias informações de uma vez (ex: "Quero agendar um corte de cabelo com o Eduardo no dia 13/03 as 09h"), use a ferramenta validateAppointment para validar tudo de uma vez. Esta ferramenta verifica:
- Se o serviço existe
- Se o profissional existe
- Se o horário está disponível

Se validateAppointment retornar que tudo é válido, confirme os detalhes com o cliente e use createAppointment.
Se algo não for válido, use as sugestões retornadas para ajudar o cliente a encontrar alternativas.
`;

// Função auxiliar para buscar profissional por similaridade de nome
async function findProfessionalByName(
  supabase: any,
  name: string,
  businessId: string
) {
  // Primeiro tenta busca exata
  const { data: exactMatch } = await supabase
    .from("professionals")
    .select("id, name")
    .eq("name", name)
    .eq("business_id", businessId)
    .single();

  if (exactMatch) {
    return exactMatch;
  }

  // Se não encontrar, busca por similaridade usando ILIKE
  const { data: similarMatches } = await supabase
    .from("professionals")
    .select("id, name")
    .ilike("name", `%${name}%`)
    .eq("business_id", businessId)
    .order("name");

  if (similarMatches && similarMatches.length > 0) {
    // Retorna o primeiro resultado mais similar
    return similarMatches[0];
  }

  return null;
}

// Função auxiliar para buscar serviço por similaridade de nome
async function findServiceByName(
  supabase: any,
  name: string,
  businessId: string
) {
  // Primeiro tenta busca exata
  const { data: exactMatch } = await supabase
    .from("services")
    .select("id, name, duration")
    .eq("name", name)
    .eq("business_id", businessId)
    .single();

  if (exactMatch) {
    return {
      found: true,
      service: exactMatch,
      suggestions: null,
    };
  }

  // Se não encontrar, busca por similaridade usando ILIKE
  const { data: similarMatches } = await supabase
    .from("services")
    .select("id, name, duration")
    .ilike("name", `%${name}%`)
    .eq("business_id", businessId)
    .order("name");

  if (similarMatches && similarMatches.length > 0) {
    // Retorna o primeiro resultado mais similar
    return {
      found: true,
      service: similarMatches[0],
      suggestions: similarMatches.slice(0, 5), // Retorna até 5 sugestões
    };
  }

  // Se não encontrar nada similar, busca todos os serviços como sugestões
  const { data: allServices } = await supabase
    .from("services")
    .select("id, name, duration")
    .eq("business_id", businessId)
    .order("name")
    .limit(5);

  return {
    found: false,
    service: null,
    suggestions: allServices || [],
  };
}

// Handlers das tools
async function handleToolCalls(toolUse: any) {
  const { name, input, toolUseId } = toolUse;

  try {
    console.log(`🔧 Tool chamada: ${name}`, { input });

    let content;
    let serviceDuration = 30; // default 30 minutes
    const supabase = await createClient();

    // Variáveis para armazenar IDs e nomes
    let serviceId;
    let professionalId;
    let serviceName;
    let professionalName;

    // Get business ID from the first business associated with the user
    const { data: businessData } = await supabase
      .from("businesses")
      .select("id")
      .limit(1)
      .single();

    const businessId = businessData?.id;

    if (!businessId) {
      throw new Error("Negócio não encontrado");
    }

    // If we have a serviceId, get its duration
    if (input.serviceId) {
      const { data: serviceData } = await supabase
        .from("services")
        .select("duration")
        .eq("id", input.serviceId)
        .single();

      if (serviceData) {
        serviceDuration = serviceData.duration;
      }
    }

    switch (name) {
      case "listServices":
        console.log("📋 Listando serviços disponíveis");
        // Fetch services from the database
        const { data: services, error: servicesError } = await supabase
          .from("services")
          .select("id, name, duration, price")
          .eq("business_id", businessId)
          .order("name");

        if (servicesError) {
          console.error("❌ Erro ao buscar serviços:", servicesError);
          throw new Error(`Erro ao buscar serviços: ${servicesError.message}`);
        }

        console.log(`✅ ${services?.length || 0} serviços encontrados`);
        content = {
          json: {
            services: services || [],
          },
        };
        console.log("✅ Serviços retornados com sucesso");
        break;

      case "listProfessionals":
        console.log("👥 Listando profissionais disponíveis");
        // Fetch professionals from the database, optionally filtered by service
        let query = supabase
          .from("professionals")
          .select("id, name")
          .eq("business_id", businessId);

        const { data: professionals, error: professionalsError } =
          await query.order("name");

        if (professionalsError) {
          console.error("❌ Erro ao buscar profissionais:", professionalsError);
          throw new Error(
            `Erro ao buscar profissionais: ${professionalsError.message}`
          );
        }

        console.log(
          `✅ ${professionals?.length || 0} profissionais encontrados`
        );
        content = {
          json: {
            professionals: professionals || [],
          },
        };
        console.log("✅ Profissionais retornados com sucesso");
        break;

      case "checkAvailability":
        console.log("🗓️ Verificando disponibilidade", {
          date: input.date,
          professionalId: input.professionalId,
          serviceId: input.serviceId,
        });
        // Check availability based on existing appointments
        if (!input.date) {
          throw new Error("Data é obrigatória para verificar disponibilidade");
        }

        // Validate professionalId - check if it's a name instead of ID
        let professionalIdForAvailability = input.professionalId;
        professionalName = input.professionalId;

        if (
          input.professionalId &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            input.professionalId
          )
        ) {
          // Try to look up professional by name with similarity
          const professionalData = await findProfessionalByName(
            supabase,
            input.professionalId,
            businessId
          );

          if (!professionalData) {
            throw new Error(
              `Profissional não encontrado: ${input.professionalId}`
            );
          }

          professionalIdForAvailability = professionalData.id;
          professionalName = professionalData.name;
        }

        // Validate serviceId - check if it's a name instead of ID
        let serviceIdForAvailability = input.serviceId;
        serviceName = input.serviceId;
        let serviceSuggestions = null;

        if (
          input.serviceId &&
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            input.serviceId
          )
        ) {
          // Try to look up service by name with similarity
          const serviceResult = await findServiceByName(
            supabase,
            input.serviceId,
            businessId
          );

          if (!serviceResult.found) {
            // Se não encontrou o serviço, retorna as sugestões
            content = {
              json: {
                available: false,
                date: input.date,
                serviceNotFound: true,
                searchTerm: input.serviceId,
                suggestions: serviceResult.suggestions,
                message: `Serviço "${input.serviceId}" não encontrado. Aqui estão algumas opções disponíveis.`,
              },
            };
            break;
          }

          serviceIdForAvailability = serviceResult.service.id;
          serviceName = serviceResult.service.name;
          serviceSuggestions = serviceResult.suggestions;

          // Update service duration if found
          if (serviceResult.service.duration) {
            serviceDuration = serviceResult.service.duration;
          }
        }

        // Get all appointments for the specified date
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

        // Get business hours (9AM-7PM)
        const businessHours = {
          start: { hour: 9, minute: 0 },
          end: { hour: 19, minute: 0 },
          interval: 30,
        };

        // Convert date string to Date object
        const currentDate = new Date(`${input.date}T00:00:00`);

        // Set start and end of business day
        const dayStart = new Date(currentDate);
        dayStart.setHours(
          businessHours.start.hour,
          businessHours.start.minute,
          0
        );

        const dayEnd = new Date(currentDate);
        dayEnd.setHours(businessHours.end.hour, businessHours.end.minute, 0);

        // Generate available slots
        const availableSlots: string[] = [];
        let currentSlot = new Date(dayStart);

        // Function to check for appointment conflicts
        const hasConflict = (start: Date, end: Date) => {
          return existingAppointments.some((appointment) => {
            const appointmentStart = new Date(appointment.start_time);
            const appointmentEnd = new Date(appointment.end_time);
            return start < appointmentEnd && end > appointmentStart;
          });
        };

        while (currentSlot < dayEnd) {
          const slotEnd = new Date(currentSlot);
          slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

          if (slotEnd <= dayEnd && !hasConflict(currentSlot, slotEnd)) {
            availableSlots.push(currentSlot.toTimeString().substring(0, 5));
          }

          // Move to next slot
          currentSlot.setMinutes(
            currentSlot.getMinutes() + businessHours.interval
          );
        }

        content = {
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
        console.log(
          `✅ Verificação de disponibilidade concluída: ${availableSlots.length} horários disponíveis`
        );
        break;

      case "validateAppointment":
        console.log("🔍 Validando agendamento completo", {
          serviceName: input.serviceName,
          professionalName: input.professionalName,
          date: input.date,
          time: input.time,
        });
        // Validar todos os dados de um agendamento em uma única chamada
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

        // 1. Validar serviço
        if (input.serviceName) {
          const serviceResult = await findServiceByName(
            supabase,
            input.serviceName,
            businessId
          );

          if (serviceResult.found) {
            validationResults.service.valid = true;
            validationResults.service.data = serviceResult.service;
            serviceDuration = serviceResult.service.duration || 30;
          } else {
            validationResults.service.suggestions = serviceResult.suggestions;
          }
        }

        // 2. Validar profissional
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
            // Buscar todos os profissionais como sugestões
            const { data: allProfessionals } = await supabase
              .from("professionals")
              .select("id, name")
              .eq("business_id", businessId)
              .order("name")
              .limit(5);

            validationResults.professional.suggestions = allProfessionals || [];
          }
        }

        // 3. Verificar disponibilidade
        if (
          input.date &&
          input.time &&
          validationResults.professional.valid &&
          validationResults.service.valid
        ) {
          const professionalId = validationResults.professional.data?.id;

          if (professionalId) {
            // Buscar agendamentos existentes
            const { data: existingAppointments } = await supabase
              .from("appointments")
              .select("start_time, end_time")
              .eq("business_id", businessId)
              .eq("professional_id", professionalId)
              .gte("start_time", `${input.date}T00:00:00`)
              .lt("start_time", `${input.date}T23:59:59`)
              .order("start_time");

            // Verificar se o horário solicitado está disponível
            const requestedTime = new Date(`${input.date}T${input.time}`);
            const requestedEndTime = new Date(
              requestedTime.getTime() + serviceDuration * 60000
            );

            // Função para verificar conflitos
            const hasConflict = (start: Date, end: Date) => {
              return (existingAppointments || []).some((appointment) => {
                const appointmentStart = new Date(appointment.start_time);
                const appointmentEnd = new Date(appointment.end_time);
                return start < appointmentEnd && end > appointmentStart;
              });
            };

            // Verificar se o horário solicitado está dentro do horário de funcionamento
            const businessHours = {
              start: { hour: 9, minute: 0 },
              end: { hour: 19, minute: 0 },
              interval: 30,
            };

            const dayStart = new Date(`${input.date}T00:00:00`);
            dayStart.setHours(
              businessHours.start.hour,
              businessHours.start.minute,
              0
            );

            const dayEnd = new Date(`${input.date}T00:00:00`);
            dayEnd.setHours(
              businessHours.end.hour,
              businessHours.end.minute,
              0
            );

            const isWithinBusinessHours =
              requestedTime >= dayStart && requestedEndTime <= dayEnd;

            // Verificar disponibilidade
            if (
              isWithinBusinessHours &&
              !hasConflict(requestedTime, requestedEndTime)
            ) {
              validationResults.availability.valid = true;
            }

            // Gerar slots disponíveis (para sugestões)
            let currentSlot = new Date(dayStart);
            while (currentSlot < dayEnd) {
              const slotEnd = new Date(currentSlot);
              slotEnd.setMinutes(slotEnd.getMinutes() + serviceDuration);

              if (slotEnd <= dayEnd && !hasConflict(currentSlot, slotEnd)) {
                validationResults.availability.availableSlots.push(
                  currentSlot.toTimeString().substring(0, 5)
                );
              }

              currentSlot.setMinutes(
                currentSlot.getMinutes() + businessHours.interval
              );
            }
          }
        }

        // Preparar resposta
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
          validationMessage = `Agendamento válido para ${validationResults.service.data.name} com ${validationResults.professional.data.name} em ${input.date} às ${input.time}`;
        }

        content = {
          json: {
            valid: isFullyValid,
            service: validationResults.service,
            professional: validationResults.professional,
            availability: validationResults.availability,
            date: input.date,
            time: input.time,
            message: validationMessage,
          },
        };
        console.log(
          `✅ Validação de agendamento concluída: ${
            isFullyValid ? "Válido" : "Inválido"
          }`
        );
        break;

      case "createAppointment":
        console.log("📝 Criando agendamento", {
          serviceId: input.serviceId,
          professionalId: input.professionalId,
          date: input.date,
          time: input.time,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
        });
        // Validate required fields and ensure IDs are strings
        const requiredFields = [
          "serviceId",
          "professionalId",
          "date",
          "time",
          "clientName",
          "clientPhone",
        ];
        for (const field of requiredFields) {
          if (!input[field]) {
            throw new Error(`Campo obrigatório ausente: ${field}`);
          }
        }

        // Validate IDs - first check if they're valid UUIDs
        // If not, try to look up the actual IDs by name
        serviceId = input.serviceId;
        professionalId = input.professionalId;
        serviceName = input.serviceId;
        professionalName = input.professionalId;

        // Check if serviceId is a name instead of ID
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            input.serviceId
          )
        ) {
          // Try to look up service by name with similarity
          const serviceResult = await findServiceByName(
            supabase,
            input.serviceId,
            businessId
          );

          if (!serviceResult.found) {
            throw new Error(
              `Serviço não encontrado: ${
                input.serviceId
              }. Por favor, escolha entre: ${serviceResult.suggestions
                .map((s: { name: string }) => s.name)
                .join(", ")}`
            );
          }

          serviceId = serviceResult.service.id;
          serviceName = serviceResult.service.name;

          // Update service duration
          if (serviceResult.service.duration) {
            serviceDuration = serviceResult.service.duration;
          }
        } else {
          serviceId = input.serviceId;
        }

        // Check if professionalId is a name instead of ID
        if (
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            input.professionalId
          )
        ) {
          // Try to look up professional by name with similarity
          const professionalData = await findProfessionalByName(
            supabase,
            input.professionalId,
            businessId
          );

          if (!professionalData) {
            throw new Error(
              `Profissional não encontrado: ${input.professionalId}`
            );
          }

          professionalId = professionalData.id;
          professionalName = professionalData.name;
        } else {
          professionalId = input.professionalId;
        }

        // Check if client exists
        let clientId;
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("phone", input.clientPhone)
          .eq("business_id", businessId)
          .single();

        if (existingClient) {
          clientId = existingClient.id;

          // Update client name if different
          await supabase
            .from("clients")
            .update({ name: input.clientName })
            .eq("id", clientId);
        } else {
          // Create new client
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

        // Calculate start and end time
        const startTime = new Date(`${input.date}T${input.time}`);
        const endTime = new Date(startTime.getTime() + serviceDuration * 60000); // duration is in minutes

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

        // Try to invalidate caches
        try {
          const {
            invalidateCacheTags,
            CacheTags,
          } = require("@/lib/cache-utils");
          const { invalidateSimpleCache } = require("@/lib/simple-cache");

          invalidateCacheTags([CacheTags.APPOINTMENTS, CacheTags.DASHBOARD]);

          // Invalidate simple cache
          const businessIdStr = businessId.toString();
          invalidateSimpleCache(`appointments-${businessIdStr}-phone-`);
          invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
          invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
          invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
        } catch (error) {
          console.error("Error invalidating cache:", error);
          // Continue even if cache invalidation fails
        }

        content = {
          json: {
            success: true,
            appointment: {
              id: appointment.id,
              serviceId,
              serviceName,
              professionalId,
              professionalName,
              clientId,
              date: input.date,
              time: input.time,
              clientName: input.clientName,
              clientPhone: input.clientPhone,
              start_time: startTime.toISOString(),
              end_time: endTime.toISOString(),
              status: "scheduled",
            },
          },
        };
        console.log(`✅ Agendamento criado com sucesso: ID ${appointment.id}`);
        break;

      default:
        throw new Error(`Ferramenta não reconhecida: ${name}`);
    }

    return {
      toolUseId,
      content: [content],
      status: "success",
    };
  } catch (error) {
    console.error(`❌ Erro na execução da tool ${name}:`, error);
    return {
      role: "assistant",
      content: [
        {
          text: error instanceof Error ? error.message : "Erro desconhecido",
        },
      ],
      status: "error",
    };
  }
}

// Helper function to generate time slots
function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots = [];
  let current = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);

  while (current < end) {
    slots.push(current.toTimeString().substring(0, 5));
    current = new Date(current.getTime() + intervalMinutes * 60000);
  }

  return slots;
}

// Helper function to calculate end time based on start time and duration
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);

  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  return endDate.toTimeString().substring(0, 5);
}

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const command = new ConverseCommand({
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      messages: messages.map((m: any) => ({
        role: m.role,
        content: Array.isArray(m.content) ? m.content : [{ text: m.content }],
      })),
      system: [{ text: SYSTEM_PROMPT }],
      toolConfig: {
        tools: [
          {
            toolSpec: {
              name: "listServices",
              description: "Lista todos os serviços disponíveis",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {},
                  additionalProperties: false,
                },
              },
            },
          },
          {
            toolSpec: {
              name: "listProfessionals",
              description:
                "Lista todos os profissionais disponíveis para um serviço",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {},
                  additionalProperties: false,
                },
              },
            },
          },
          {
            toolSpec: {
              name: "checkAvailability",
              description:
                "Verifica disponibilidade de horários para um profissional em uma data",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {
                    professionalId: {
                      type: "string",
                      description: "ID ou nome do profissional",
                    },
                    date: {
                      type: "string",
                      description: "Data no formato YYYY-MM-DD",
                    },
                    serviceId: {
                      type: "string",
                      description: "ID ou nome do serviço (opcional)",
                    },
                  },
                  required: ["date"],
                  additionalProperties: false,
                },
              },
            },
          },
          {
            toolSpec: {
              name: "validateAppointment",
              description:
                "Valida todos os dados de um agendamento: serviço, profissional e disponibilidade",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {
                    serviceName: {
                      type: "string",
                      description: "Nome do serviço desejado",
                    },
                    professionalName: {
                      type: "string",
                      description: "Nome do profissional desejado",
                    },
                    date: {
                      type: "string",
                      description: "Data no formato YYYY-MM-DD",
                    },
                    time: {
                      type: "string",
                      description: "Horário no formato HH:MM",
                    },
                  },
                  required: ["serviceName", "date", "time"],
                  additionalProperties: false,
                },
              },
            },
          },
          {
            toolSpec: {
              name: "createAppointment",
              description: "Cria um novo agendamento",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {
                    serviceId: {
                      type: "string",
                      description: "ID ou nome do serviço",
                    },
                    professionalId: {
                      type: "string",
                      description: "ID ou nome do profissional",
                    },
                    date: {
                      type: "string",
                      description: "Data no formato YYYY-MM-DD",
                    },
                    time: {
                      type: "string",
                      description: "Horário no formato HH:MM",
                    },
                    clientName: {
                      type: "string",
                      description: "Nome do cliente",
                    },
                    clientPhone: {
                      type: "string",
                      description: "Telefone do cliente",
                    },
                    notes: {
                      type: "string",
                      description: "Observações (opcional)",
                    },
                  },
                  required: [
                    "serviceId",
                    "professionalId",
                    "date",
                    "time",
                    "clientName",
                    "clientPhone",
                  ],
                  additionalProperties: false,
                },
              },
            },
          },
        ],
      },
      inferenceConfig: {
        maxTokens: 1024,
        temperature: 0.1,
        topP: 0.3,
      },
    });

    const response = await bedrock.send(command);

    if (response.stopReason === "tool_use") {
      const toolUses = response.output?.message?.content
        ?.filter((content) => content.toolUse)
        .map((content) => content.toolUse);

      if (toolUses?.length) {
        const toolResults = await Promise.all(toolUses.map(handleToolCalls));

        const toolResultMessage = {
          role: "user",
          content: toolResults.map((result) => ({
            toolResult: {
              toolUseId: result.toolUseId,
              content: result.content,
              status: result.status,
            },
          })),
        };

        // Recursivamente chama a API com os resultados das ferramentas
        return await POST(
          new Request(req.url, {
            method: "POST",
            headers: req.headers,
            body: JSON.stringify({
              messages: [
                ...messages,
                response.output?.message,
                toolResultMessage,
              ],
            }),
          })
        );
      }
    }

    const text = response.output?.message?.content?.[0]?.text;
    if (!text) {
      throw new Error("No completion received from Bedrock");
    }

    return NextResponse.json({ completion: text });
  } catch (error) {
    console.error("Bedrock error:", error);
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
