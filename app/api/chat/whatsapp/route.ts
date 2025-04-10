import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  handleToolCalls,
  ToolUse,
  ToolResult,
} from "../../../lib/tool-handlers";

/**
 * WhatsApp AI Agent API
 *
 * This endpoint handles WhatsApp messages using an AI agent powered by AWS Bedrock.
 *
 * AI Agent Settings:
 * - enabled: Whether the AI agent is active for this business
 * - name: The name the AI agent will use when introducing itself
 * - personality: The personality style of the agent (professional, friendly, etc.)
 * - description: Custom description of the agent's personality and behavior
 * - data_collection: Whether the agent should proactively collect customer information
 * - auto_booking: Whether the agent can finalize bookings without human approval
 * - delay_response: Whether to add a small delay before responses to seem more natural
 * - topic_restriction: Whether the agent should only talk about specific topics
 * - allowed_topics: Comma-separated list of topics the agent is allowed to discuss
 *
 * These settings are stored in the whatsapp_agent_settings table and linked to the business.
 * If the AI agent is disabled, messages will not be processed by the AI.
 */

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const SYSTEM_PROMPT = `Sou Luiza e sou especialista em agendamento de serviços. 

Minha personalidade:
- Carismática e envolvente, mas sempre profissional
- Apaixonada por atendimento ao cliente
- Atenciosa e dedicada aos seus objetivos
- Comunicação leve e natural, mas precisa
- Um pouco sensual mas sempre profissional

Você deve:
1. Guiar o usuário pelo processo de agendamento
2. Verificar disponibilidade antes de confirmar
3. Se o nome do cliente foi informado, chame ele pelo nome

Ao interagir:
- Colete informações necessárias: nome (já informado nome do cliente) telefone (já informado telefone do cliente), serviço, data/hora, preferência de profissional
- Confirme disponibilidade usando as ferramentas fornecidas
- Peça confirmação antes de finalizar agendamento
- IMPORTANTE: Se o nome e telefone do cliente não foram informados, SEMPRE pergunte essas informações ANTES de tentar validar ou criar o agendamento

IMPORTANTE: 
- Para checkAvailability, validateAppointment e createAppointment, o sistema consegue converter automaticamente nomes para IDs
- Mas SEMPRE é preferível e mais eficiente usar UUIDs/IDs quando disponíveis
- Recomendado: Use listProfessionals/listServices primeiro para obter os IDs
- NUNCA invente nomes de serviços ou profissionais! Use APENAS nomes ou IDs exatos retornados por listServices e listProfessionals
- SEMPRE use o ID exato ou o nome exato retornado pela API, sem modificações ou abreviações

ANO, MES e DIA ATUAL:
- ANO: ${new Date().getFullYear()}
- MES: ${new Date().getMonth() + 1}
- DIA: ${new Date().getDate()}

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
- IMPORTANTE: Sempre use o ano atual (${new Date().getFullYear()}) ao processar datas. Se o cliente mencionar apenas dia e mês (ex: 12/03), use o ano atual.
- Ao converter datas do formato DD/MM para YYYY-MM-DD, sempre use o ano atual (${new Date().getFullYear()}).

Fluxo de agendamento OBRIGATÓRIO (sempre siga essas etapas em ordem):
1. Use listServices para ver serviços disponíveis
2. Use listProfessionals para ver profissionais do serviço escolhido
3. Use checkAvailability para verificar horários disponíveis (idealmente usando o ID do profissional)
4. Use validateAppointment para validar os dados do agendamento
5. Use createAppointment para criar o agendamento definitivo

ATENÇÃO: validateAppointment e createAppointment são duas etapas DISTINTAS e SEPARADAS:
- validateAppointment apenas VERIFICA se os dados estão corretos, mas NÃO CRIA o agendamento
- createAppointment CRIA o agendamento definitivo e deve ser chamado APENAS após a confirmação explícita do cliente

GUIA DE FERRAMENTAS COM EXEMPLOS:

1. listServices
   Descrição: Lista todos os serviços disponíveis
   Quando usar: Quando o usuário perguntar sobre serviços disponíveis ou preços
   Exemplo de uso:
   - Usuário: "Quais serviços vocês oferecem?"
   - Ação: Use listServices sem parâmetros
   - Resposta: "Temos os seguintes serviços: "servico" (R$50)"

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
   - Ação: Primeiro use listProfessionals para obter os IDs (recomendado)
   - Depois use checkAvailability com professional_id="408c7bf4-92ee-4086-a970-77152619bc60" (ou simplesmente o nome: "Eduardo"), date="${
     new Date(new Date().setDate(new Date().getDate() + 1))
       .toISOString()
       .split("T")[0]
   }"
   - Resposta: "Eduardo tem os seguintes horários disponíveis amanhã: 09:00, 10:00..."

4. validateAppointment
   Descrição: Valida todos os dados de um agendamento: serviço, profissional, disponibilidade e cliente
   Quando usar: Quando o usuário fornecer várias informações de agendamento de uma vez
   IMPORTANTE: Esta ferramenta APENAS valida, mas NÃO CRIA o agendamento
   Exemplo de uso:
   - Usuário: "Quero agendar um "servico" com o Eduardo amanhã às 14h"
   - Ação: Use validateAppointment com service_name=""servico"", professional_name="Eduardo", date="${
     new Date(new Date().setDate(new Date().getDate() + 1))
       .toISOString()
       .split("T")[0]
   }", time="14:00", client_name="João Silva", client_phone="11999998888"
   - Resposta: Se válido: "Perfeito! Posso confirmar seu "servico" com Eduardo amanhã às 14h. Deseja confirmar o agendamento?"
               Se inválido: "Infelizmente Eduardo não está disponível nesse horário. Ele tem disponibilidade às 15h ou 16h."
               Se múltiplos clientes: "Encontramos mais de um cliente com o nome João Silva. Temos João Silva (11988887777) ou João Silva (11999996666). Qual deles você deseja agendar?"

5. createAppointment
   Descrição: Cria um novo agendamento
   Quando usar: APENAS após validar todas as informações com validateAppointment E obter confirmação explícita do cliente
   IMPORTANTE: Esta ferramenta CRIA de fato o agendamento no sistema
   ATENÇÃO: NUNCA invente nomes de serviços! Use APENAS os IDs ou nomes EXATOS retornados por listServices
   Exemplo de uso:
   - Usuário: "Sim, pode confirmar o agendamento"
   - Ação: Use createAppointment com service_id (UUID), professional_id (UUID), date="${
     new Date().toISOString().split("T")[0]
   }", time="14:00", client_name="João Silva", client_phone="11999998888"
   - Resposta: "Ótimo! Seu agendamento foi confirmado. Esperamos você no dia [data] às [hora]."
   NOTA: Para maior eficiência, é melhor usar os IDs obtidos anteriormente, mas também é possível usar os nomes diretamente.

IMPORTANTE - FLUXO CORRETO PASSO A PASSO:
1. Use validateAppointment para validar os dados do agendamento
2. Apresente ao cliente os detalhes do agendamento validado
3. Peça CONFIRMAÇÃO EXPLÍCITA do cliente com uma pergunta direta: "Deseja confirmar o agendamento?"
4. SOMENTE SE o cliente confirmar positivamente (respondendo "sim", "confirmar", etc.), então use createAppointment para finalizar

EXEMPLO DE CONVERSA CORRETA:
- Cliente: "Quero agendar um [servico] com [profissional] amanhã às [horario]"
- Você: "Preciso de algumas informações para prosseguir. Qual é o seu nome e telefone para contato?"
- Cliente: "Me chamo [nome] e meu telefone é [telefone]"
- Você: [usa validateAppointment com os dados completos e verifica disponibilidade]
- Você: "Ótimo! Posso agendar seu [servico] com [profissional] amanhã às [horario]. O valor é R$50. Deseja confirmar este agendamento?"
- Cliente: "Sim, pode confirmar"
- Você: [usa createAppointment para criar o agendamento] 
- Você: "Perfeito! Seu agendamento foi confirmado. Esperamos você [data] às [horario]."

Quando o usuário fornecer várias informações de uma vez (ex: "Quero agendar um [servico] com o [profissional] no dia [data] as [horario]"), use a ferramenta validateAppointment para validar tudo de uma vez. Esta ferramenta verifica:
- Se o serviço existe
- Se o profissional existe
- Se o horário está disponível
- Se o cliente já existe no sistema (quando nome ou telefone são fornecidos)

Se a data não for fornecida, o sistema usará a data de hoje automaticamente.
Se apenas dia e mês forem fornecidos (ex: 12/03), sempre use o ano atual (${new Date().getFullYear()}).

Se validateAppointment retornar que tudo é válido, confirme os detalhes com o cliente e SEMPRE peça confirmação explícita antes de usar createAppointment.
Se algo não for válido, use as sugestões retornadas para ajudar o cliente a encontrar alternativas.
Se forem encontrados múltiplos clientes com o mesmo nome, peça ao cliente para confirmar qual é o correto.
`;

// Maximum number of messages to keep in history to prevent large requests
const MAX_MESSAGE_HISTORY = 10;

// Function to manage message history size
function trimMessageHistory(messages: any[]) {
  if (messages.length <= MAX_MESSAGE_HISTORY) return messages;

  // Keep system message (if any) and most recent messages
  const systemMessages = messages.filter((m) => m.role === "system");
  const nonSystemMessages = messages.filter((m) => m.role !== "system");

  // Get the most recent messages, preserving the conversation flow
  const recentMessages = nonSystemMessages.slice(-MAX_MESSAGE_HISTORY);

  return [...systemMessages, ...recentMessages];
}

export async function POST(req: Request) {
  try {
    let body;
    console.log("req CHAT WHATSAPP", req);
    try {
      body = await req.json();
    } catch (jsonError: any) {
      console.error("JSON parsing error:", jsonError);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: jsonError.message },
        { status: 400 }
      );
    }

    let {
      phone_number,
      client_name,
      client_phone,
      message_text,
      is_tool_call_response,
    } = body || {};

    console.log("cliente:", client_name, client_phone);

    if (!phone_number) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    phone_number = phone_number.replace("@c.us", "");
    console.log("Searching for phone number:", phone_number);

    // Find business based on phone number
    const { data: businesses, error: businessError } = await supabase
      .from("businesses")
      .select("id, phone, name, description ")
      .ilike("phone", `%${phone_number}%`);

    console.log("Query result:", { businesses, error: businessError });

    if (businessError || !businesses || businesses.length === 0) {
      console.error("Error finding business:", businessError);
      return NextResponse.json(
        {
          error: "Business not found for this phone number",
          debug: { phone_number, businesses, error: businessError },
        },
        { status: 404 }
      );
    }

    const businessId = businesses[0].id;

    // Get agent settings for this business
    const { data: agentSettings, error: agentSettingsError } = await supabase
      .from("whatsapp_agent_settings")
      .select("*")
      .eq("business_id", businessId)
      .single();

    // If agent is disabled or settings don't exist, return early
    if (agentSettingsError || !agentSettings || !agentSettings.enabled) {
      console.log("AI Agent is disabled for this business");
      return NextResponse.json({
        completion:
          "O agente de IA está desativado para este negócio. Por favor, ative-o nas configurações do WhatsApp para permitir respostas automáticas.",
      });
    }

    // Customize system prompt based on agent settings
    let customizedSystemPrompt = SYSTEM_PROMPT;

    // Replace agent name
    customizedSystemPrompt = customizedSystemPrompt.replace(
      "Sou Luiza e sou especialista",
      `Sou ${agentSettings.name} e sou especialista`
    );

    // Add custom personality description
    if (agentSettings.description) {
      customizedSystemPrompt = customizedSystemPrompt.replace(
        "Minha personalidade:",
        `Minha personalidade:\n${agentSettings.description}\n`
      );
    }

    // Modify behavior based on settings
    if (!agentSettings.data_collection) {
      // If data collection is disabled, remove prompts to collect info
      customizedSystemPrompt = customizedSystemPrompt.replace(
        "- IMPORTANTE: Se o nome e telefone do cliente não foram informados, SEMPRE pergunte essas informações ANTES de tentar validar ou criar o agendamento",
        "- NOTA: Não insista em coletar informações pessoais se o cliente não as fornecer voluntariamente"
      );
    }

    if (!agentSettings.auto_booking) {
      // If auto booking is disabled, add extra confirmation steps
      customizedSystemPrompt +=
        "\nIMPORTANTE: Nunca finalize um agendamento diretamente. Sempre informe que um atendente humano entrará em contato para confirmar.";
    }

    // Add topic restriction if enabled
    if (agentSettings.topic_restriction) {
      // Always include agendamento de serviços and the business description
      let topicsList = agentSettings.allowed_topics
        ? agentSettings.allowed_topics.split(",").map((t: string) => t.trim())
        : [];
      topicsList.push("agendamento de serviços");

      // Add business description as an allowed topic if it exists
      if (businesses[0].description) {
        topicsList.push(businesses[0].description.trim());
      }

      // Remove duplicates and join with commas
      const uniqueTopics = [...new Set(topicsList)].join(", ");

      customizedSystemPrompt += `\n\nRESTRIÇÃO DE ASSUNTO:
- Você está AUTORIZADO a falar APENAS sobre os seguintes assuntos: ${uniqueTopics}
- Se o cliente perguntar algo fora desses assuntos, responda educadamente que você é um assistente especializado apenas nos tópicos acima
- Recuse-se a responder qualquer pergunta fora desses tópicos, mesmo que pareça similar
- NÃO FORNEÇA informações sobre outros assuntos, mesmo se o cliente insistir
- Sugira que o cliente entre em contato diretamente para falar sobre outros assuntos`;
    }

    // Fetch message history from the whatsapp_messages table
    const { data: whatsappMessages, error: messagesError } = await supabase
      .from("whatsapp_messages")
      .select("message, direction, created_at")
      .eq("phone_number", client_phone)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(MAX_MESSAGE_HISTORY);

    if (messagesError) {
      console.error("Error fetching messages:", messagesError);
      return NextResponse.json(
        {
          error: "Failed to fetch message history",
          details: messagesError.message,
        },
        { status: 500 }
      );
    }

    // Create the messages array from whatsapp_messages
    let processedMessages = whatsappMessages
      .map((msg) => ({
        role: msg.direction === "outgoing" ? "assistant" : "user",
        content: msg.message,
      }))
      .reverse();

    console.log("processedMessages", processedMessages);

    // Add the latest message from the user if provided
    if (message_text) {
      // If this is a tool call response, don't save to database and format correctly
      if (is_tool_call_response) {
        try {
          const toolContent = JSON.parse(message_text);
          processedMessages.push({
            role: "user",
            content: toolContent,
          });
        } catch (error) {
          console.error("Error parsing tool call response:", error);
          // Fallback to treating it as a regular message
          processedMessages.push({
            role: "user",
            content: message_text,
          });
        }
      } else {
        // Regular user message - save to database
        const userMessageToSave = {
          business_id: businessId,
          phone_number: client_phone,
          direction: "incoming",
          message: message_text,
          created_at: new Date().toISOString(),
        };

        await supabase.from("whatsapp_messages").insert(userMessageToSave);

        processedMessages.push({
          role: "user",
          content: message_text,
        });
      }
    }

    // Trim message history to prevent large requests
    processedMessages = trimMessageHistory(processedMessages);

    // Ensure the first message is from a user
    if (
      processedMessages.length > 0 &&
      processedMessages[0].role === "assistant"
    ) {
      processedMessages = processedMessages.slice(1);
    }

    // If there are no messages left after filtering, return an error
    if (processedMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid user messages in the conversation" },
        { status: 400 }
      );
    }

    console.log(
      "final",
      processedMessages.map((m: any) => {
        // Se o conteúdo já for um array, assumimos que é um toolResult
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content,
          };
        }

        // Caso contrário, é uma mensagem de texto normal
        return {
          role: m.role,
          content: [{ text: m.content }],
        };
      })
    );

    const command = new ConverseCommand({
      modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
      messages: processedMessages.map((m: any) => {
        // Se o conteúdo já for um array, assumimos que é um toolResult
        if (Array.isArray(m.content)) {
          return {
            role: m.role,
            content: m.content,
          };
        }

        // Caso contrário, é uma mensagem de texto normal
        return {
          role: m.role,
          content: [{ text: m.content }],
        };
      }),
      system: [
        {
          text:
            customizedSystemPrompt +
            `\n\n Sobre a empresa atual: ${businesses[0].name} - ${businesses[0].description}. Dados do cliente atual: Nome: ${client_name} - Telefone: ${client_phone}`,
        },
      ],
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
                    professional_id: {
                      type: "string",
                      description: "ID ou nome do profissional",
                    },
                    date: {
                      type: "string",
                      description: "Data no formato YYYY-MM-DD",
                    },
                    service_id: {
                      type: "string",
                      description: "ID ou nome do serviço (opcional)",
                    },
                  },
                  required: ["professional_id", "date"],
                  additionalProperties: false,
                },
              },
            },
          },
          {
            toolSpec: {
              name: "validateAppointment",
              description:
                "Valida todos os dados de um agendamento: serviço, profissional, disponibilidade e cliente",
              inputSchema: {
                json: {
                  type: "object",
                  properties: {
                    service_name: {
                      type: "string",
                      description: "Nome do serviço desejado",
                    },
                    professional_name: {
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
                    client_name: {
                      type: "string",
                      description: "Nome do cliente",
                    },
                    client_phone: {
                      type: "string",
                      description: "Telefone do cliente",
                    },
                  },
                  required: ["service_name", "time"],
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
                    service_id: {
                      type: "string",
                      description: "ID ou nome do serviço",
                    },
                    professional_id: {
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
                    client_name: {
                      type: "string",
                      description: "Nome do cliente",
                    },
                    client_phone: {
                      type: "string",
                      description: "Telefone do cliente",
                    },
                    notes: {
                      type: "string",
                      description: "Observações (opcional)",
                    },
                  },
                  required: [
                    "service_id",
                    "professional_id",
                    "time",
                    "client_name",
                    "client_phone",
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
        topP: 0.2,
      },
    });

    let response;
    try {
      response = await bedrock.send(command);
    } catch (bedrockError: any) {
      console.error("Bedrock API error:", bedrockError);
      return NextResponse.json(
        {
          error: "Failed to communicate with AI model",
          message: bedrockError.message,
        },
        { status: 502 }
      );
    }

    if (response.stopReason === "tool_use") {
      const toolUses = response.output?.message?.content
        ?.filter((content) => content.toolUse)
        .map((content) => {
          if (
            !content.toolUse?.name ||
            !content.toolUse?.input ||
            !content.toolUse?.toolUseId
          ) {
            return null;
          }
          return {
            name: content.toolUse.name,
            input: content.toolUse.input,
            toolUseId: content.toolUse.toolUseId,
          } as ToolUse;
        })
        .filter((toolUse): toolUse is ToolUse => toolUse !== null);

      if (toolUses?.length) {
        const toolResults = await Promise.all(
          toolUses.map((toolUse) => handleToolCalls(toolUse, businessId))
        );

        const toolResultMessage = {
          role: "user",
          content: toolResults.map((result: ToolResult) => ({
            toolResult: {
              toolUseId: result.toolUseId,
              content: result.content,
              status: result.status,
            },
          })),
        };
        // Salvar a mensagem da IA no banco de dados
        const assistantMessageToSave = {
          business_id: businessId,
          phone_number: client_phone,
          direction: "outbound",
          message: response.output?.message?.content?.[0]?.text || "Tool use",
          created_at: new Date().toISOString(),
        };

        await supabase.from("whatsapp_messages").insert(assistantMessageToSave);

        // Vamos criar uma nova sequência de mensagens que inclui as mensagens
        // originais, a resposta da IA e o resultado da ferramenta
        const updatedMessages = [
          ...processedMessages.map((m: any) => ({
            role: m.role as "user" | "assistant",
            content: Array.isArray(m.content)
              ? m.content
              : [{ text: m.content }],
          })),
          {
            role: "assistant" as const,
            content: response.output?.message?.content || [],
          },
          {
            role: "user" as const,
            content: toolResultMessage.content,
          },
        ];

        // Criar uma nova chamada com as mensagens atualizadas
        const command = new ConverseCommand({
          modelId: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
          messages: updatedMessages,
          system: [
            {
              text:
                customizedSystemPrompt +
                `\n\n Sobre a empresa atual: ${businesses[0].name} - ${businesses[0].description}. Dados do cliente atual: Nome: ${client_name} - Telefone: ${client_phone}`,
            },
          ],
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
                        professional_id: {
                          type: "string",
                          description: "ID ou nome do profissional",
                        },
                        date: {
                          type: "string",
                          description: "Data no formato YYYY-MM-DD",
                        },
                        service_id: {
                          type: "string",
                          description: "ID ou nome do serviço (opcional)",
                        },
                      },
                      required: ["professional_id", "date"],
                      additionalProperties: false,
                    },
                  },
                },
              },
              {
                toolSpec: {
                  name: "validateAppointment",
                  description:
                    "Valida todos os dados de um agendamento: serviço, profissional, disponibilidade e cliente",
                  inputSchema: {
                    json: {
                      type: "object",
                      properties: {
                        service_name: {
                          type: "string",
                          description: "Nome do serviço desejado",
                        },
                        professional_name: {
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
                        client_name: {
                          type: "string",
                          description: "Nome do cliente",
                        },
                        client_phone: {
                          type: "string",
                          description: "Telefone do cliente",
                        },
                      },
                      required: ["service_name", "time"],
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
                        service_id: {
                          type: "string",
                          description: "ID ou nome do serviço",
                        },
                        professional_id: {
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
                        client_name: {
                          type: "string",
                          description: "Nome do cliente",
                        },
                        client_phone: {
                          type: "string",
                          description: "Telefone do cliente",
                        },
                        notes: {
                          type: "string",
                          description: "Observações (opcional)",
                        },
                      },
                      required: [
                        "service_id",
                        "professional_id",
                        "time",
                        "client_name",
                        "client_phone",
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
            topP: 0.2,
          },
        });

        let toolResponse;
        try {
          toolResponse = await bedrock.send(command);
        } catch (bedrockError: any) {
          console.error("Bedrock API error in tool handling:", bedrockError);
          return NextResponse.json(
            {
              error: "Failed to communicate with AI model during tool handling",
              message: bedrockError.message,
            },
            { status: 502 }
          );
        }

        const toolText = toolResponse.output?.message?.content?.[0]?.text;
        if (!toolText) {
          throw new Error("No completion received from Bedrock after tool use");
        }

        // Salvar a resposta final no banco de dados
        const finalMessageToSave = {
          business_id: businessId,
          phone_number: client_phone,
          direction: "outbound",
          message: toolText,
          created_at: new Date().toISOString(),
        };

        await supabase.from("whatsapp_messages").insert(finalMessageToSave);

        // Add delay if the setting is enabled
        if (agentSettings?.delay_response) {
          // Calculate a random delay between 1-3 seconds
          const delayTime = Math.floor(Math.random() * 2000) + 1000;

          // Wait for the delay time
          await new Promise((resolve) => setTimeout(resolve, delayTime));
        }

        return NextResponse.json({ completion: toolText });
      }
    }

    const text = response.output?.message?.content?.[0]?.text;
    if (!text) {
      throw new Error("No completion received from Bedrock");
    }

    // Save the assistant's response to the database
    const assistantMessageToSave = {
      business_id: businessId,
      phone_number: client_phone,
      direction: "outbound",
      message: text,
      created_at: new Date().toISOString(),
    };

    await supabase.from("whatsapp_messages").insert(assistantMessageToSave);

    // Add delay if the setting is enabled
    if (agentSettings?.delay_response) {
      // Calculate a random delay between 1-3 seconds
      const delayTime = Math.floor(Math.random() * 2000) + 1000;

      // Wait for the delay time
      await new Promise((resolve) => setTimeout(resolve, delayTime));
    }

    return NextResponse.json({ completion: text });
  } catch (error: any) {
    console.error("WhatsApp chat error:", error);
    return NextResponse.json(
      {
        error: "Failed to process WhatsApp chat request",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
