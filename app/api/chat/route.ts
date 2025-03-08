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

Fluxo de agendamento:
1. Use listServices para ver serviços disponíveis
2. Use listProfessionals para ver profissionais do serviço escolhido
3. Use checkAvailability para verificar horários disponíveis
4. Use createAppointment apenas após confirmação do cliente`;

// Handlers das tools
async function handleToolCalls(toolUse: any) {
  const { name, input, toolUseId } = toolUse;

  try {
    let content;
    const supabase = await createClient();

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

    switch (name) {
      case "listServices":
        // Fetch services from the database
        const { data: services, error: servicesError } = await supabase
          .from("services")
          .select("id, name, duration, price")
          .eq("business_id", businessId)
          .order("name");

        if (servicesError) {
          throw new Error(`Erro ao buscar serviços: ${servicesError.message}`);
        }

        content = {
          json: {
            services: services || [],
          },
        };
        break;

      case "listProfessionals":
        // Fetch professionals from the database, optionally filtered by service
        let query = supabase
          .from("professionals")
          .select("id, name")
          .eq("business_id", businessId);

        const { data: professionals, error: professionalsError } =
          await query.order("name");

        if (professionalsError) {
          throw new Error(
            `Erro ao buscar profissionais: ${professionalsError.message}`
          );
        }

        content = {
          json: {
            professionals: professionals || [],
          },
        };
        break;

      case "checkAvailability":
        // Check availability based on existing appointments
        if (!input.date) {
          throw new Error("Data é obrigatória para verificar disponibilidade");
        }

        // Get all appointments for the specified date
        const { data: existingAppointments, error: appointmentsError } =
          await supabase
            .from("appointments")
            .select("id, professional_id, service_id, start_time, end_time")
            .eq("business_id", businessId)
            .eq("date", input.date);

        if (appointmentsError) {
          throw new Error(
            `Erro ao verificar disponibilidade: ${appointmentsError.message}`
          );
        }

        // Get business hours (assuming 9AM-6PM if not configured)
        const businessHours = {
          start: "09:00",
          end: "18:00",
          interval: 60, // minutes
        };

        // Generate all possible time slots
        const allTimeSlots = generateTimeSlots(
          businessHours.start,
          businessHours.end,
          businessHours.interval
        );

        // If professional ID is provided, filter slots by professional availability
        let availableSlots = allTimeSlots;

        if (input.professionalId) {
          // Filter out slots that conflict with existing appointments for this professional
          const professionalAppointments = existingAppointments.filter(
            (app) => app.professional_id === input.professionalId
          );

          availableSlots = allTimeSlots.filter((slot) => {
            return !professionalAppointments.some((app) => {
              // Simple check: if slot time is between appointment start and end time
              return slot >= app.start_time && slot < app.end_time;
            });
          });

          content = {
            json: {
              available: availableSlots.length > 0,
              date: input.date,
              slots: allTimeSlots,
              professional: {
                id: input.professionalId,
                availableSlots: availableSlots,
              },
            },
          };
        } else {
          content = {
            json: {
              available: true,
              date: input.date,
              slots: allTimeSlots,
              professional: null,
            },
          };
        }
        break;

      case "createAppointment":
        // Validate required fields
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

        // Get service details to calculate end time
        const { data: serviceData, error: serviceError } = await supabase
          .from("services")
          .select("duration")
          .eq("id", input.serviceId)
          .single();

        if (serviceError) {
          throw new Error(
            `Erro ao buscar detalhes do serviço: ${serviceError.message}`
          );
        }

        const serviceDuration = serviceData?.duration || 60; // Default to 60 minutes

        // Calculate end time
        const startTime = input.time;
        const endTime = calculateEndTime(startTime, serviceDuration);

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

        // Create appointment
        const { data: appointment, error: createError } = await supabase
          .from("appointments")
          .insert({
            business_id: businessId,
            service_id: input.serviceId,
            professional_id: input.professionalId,
            client_id: clientId,
            date: input.date,
            start_time: startTime,
            end_time: endTime,
            status: "confirmed",
          })
          .select("id")
          .single();

        if (createError) {
          throw new Error(`Erro ao criar agendamento: ${createError.message}`);
        }

        content = {
          json: {
            success: true,
            appointment: {
              id: appointment.id,
              ...input,
            },
          },
        };
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
    console.error("Tool error:", error);
    return {
      toolUseId,
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
                  properties: {
                    serviceId: {
                      type: "string",
                      description: "ID do serviço",
                    },
                  },
                  required: ["serviceId"],
                  additionalProperties: false,
                },
              },
            },
          },
          {
            toolSpec: {
              name: "checkAvailability",
              description: "Verifica disponibilidade de horários",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {
                    date: {
                      type: "string",
                      description: "Data no formato YYYY-MM-DD",
                    },
                    professionalId: {
                      type: "string",
                      description: "ID do profissional (opcional)",
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
              name: "createAppointment",
              description: "Cria um agendamento",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {
                    serviceId: {
                      type: "string",
                      description: "ID do serviço",
                    },
                    professionalId: {
                      type: "string",
                      description: "ID do profissional",
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
