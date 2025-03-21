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

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const SYSTEM_PROMPT = `Sou Luiza, sua parceira especialista em agendamentos.

Minha personalidade:
- Carismática e envolvente, mas sempre profissional
- Apaixonada por atendimento ao cliente
- Atenciosa e dedicada aos seus objetivos
- Comunicação leve e natural, mas precisa
- Um pouco sensual mas sempre profissional

Você deve:
1. Guiar o usuário pelo processo de agendamento
2. Verificar disponibilidade antes de confirmar

Ao interagir:
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
- IMPORTANTE: Sempre use o ano atual (${new Date().getFullYear()}) ao processar datas. Se o cliente mencionar apenas dia e mês (ex: 12/03), use o ano atual.
- Ao converter datas do formato DD/MM para YYYY-MM-DD, sempre use o ano atual (${new Date().getFullYear()}).

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
   - Resposta: "Temos os seguintes serviços: "servico" (R$50), manicure (R$30)..."

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
   Descrição: Valida todos os dados de um agendamento: serviço, profissional, disponibilidade e cliente
   Quando usar: Quando o usuário fornecer várias informações de agendamento de uma vez
   Exemplo de uso:
   - Usuário: "Quero agendar um "servico" com o Eduardo amanhã às 14h"
   - Ação: Use validateAppointment com serviceName=""servico"", professionalName="Eduardo", date="${
     new Date(new Date().setDate(new Date().getDate() + 1))
       .toISOString()
       .split("T")[0]
   }", time="14:00", clientName="João Silva", clientPhone="11999998888"
   - Resposta: Se válido: "Perfeito! Posso confirmar seu "servico" com Eduardo amanhã às 14h."
               Se inválido: "Infelizmente Eduardo não está disponível nesse horário. Ele tem disponibilidade às 15h ou 16h."
               Se múltiplos clientes: "Encontramos mais de um cliente com o nome João Silva. Temos João Silva (11988887777) ou João Silva (11999996666). Qual deles você deseja agendar?"

5. createAppointment
   Descrição: Cria um novo agendamento
   Quando usar: APENAS após validar todas as informações e obter confirmação do cliente
   Exemplo de uso:
   - Usuário: "Sim, pode confirmar"
   - Ação: Use createAppointment com serviceId="uuid-do-serviço", professionalId="uuid-do-profissional", date="${
     new Date().toISOString().split("T")[0]
   }", time="14:00", clientName="João Silva", clientPhone="11999998888"
   - Resposta: "Ótimo! Seu agendamento foi confirmado. Esperamos você no dia [data] às [hora]."
   NOTA: Você pode usar nomes de serviços e profissionais diretamente nos campos serviceId e professionalId. O sistema automaticamente encontrará os IDs corretos.

IMPORTANTE - FLUXO OTIMIZADO:
Quando o usuário fornecer várias informações de uma vez (ex: "Quero agendar um "servico" com o Eduardo no dia 13/03 as 09h"), use a ferramenta validateAppointment para validar tudo de uma vez. Esta ferramenta verifica:
- Se o serviço existe
- Se o profissional existe
- Se o horário está disponível
- Se o cliente já existe no sistema (quando nome ou telefone são fornecidos)

Se a data não for fornecida, o sistema usará a data de hoje automaticamente.
Se apenas dia e mês forem fornecidos (ex: 12/03), sempre use o ano atual (${new Date().getFullYear()}).

Se validateAppointment retornar que tudo é válido, confirme os detalhes com o cliente e use createAppointment.
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
    let { messages, phone_number, client_name, client_phone } =
      await req.json();

    if (!phone_number) {
      return NextResponse.json(
        { error: "Phone number is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    phone_number = phone_number.replace("@c.us", "");
    console.log("Searching for phone number:", phone_number);

    // remove @c.us from phone_number
    // Get business by phone number - with debug
    const { data: businesses, error: businessError } = await supabase
      .from("businesses")
      .select("id, phone")
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

    console.log("messages", messages);

    // Trim message history to prevent large requests
    const trimmedMessages = trimMessageHistory(messages);

    console.log(
      "Messages",
      JSON.stringify(
        trimmedMessages.map((m: any) => ({
          role: m.role,
          content: Array.isArray(m.content) ? m.content : [{ text: m.content }],
        }))
      )
    );

    const command = new ConverseCommand({
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      messages: trimmedMessages.map((m: any) => ({
        role: m.role,
        content: Array.isArray(m.content) ? m.content : [{ text: m.content }],
      })),
      system: [
        {
          text: SYSTEM_PROMPT + `\n\nCliente: ${client_name} - ${client_phone}`,
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
                "Valida todos os dados de um agendamento: serviço, profissional, disponibilidade e cliente",
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
                    clientName: {
                      type: "string",
                      description: "Nome do cliente",
                    },
                    clientPhone: {
                      type: "string",
                      description: "Telefone do cliente",
                    },
                  },
                  required: ["serviceName", "time"],
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
        temperature: 0,
        topP: 0.2,
      },
    });

    const response = await bedrock.send(command);

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
          toolUses.map((toolUse) =>
            handleToolCalls(toolUse, supabase, businessId)
          )
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

        // Recursively call the API with tool results, but manage history size
        // Keep only the most recent messages to prevent the request from growing too large
        const newMessages = trimMessageHistory([
          ...trimmedMessages,
          response.output?.message,
          toolResultMessage,
        ]);

        const newReq = new Request(req.url, {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify({
            messages: newMessages,
            phone_number,
            client_name,
            client_phone,
          }),
        });

        return await POST(newReq);
      }
    }

    const text = response.output?.message?.content?.[0]?.text;
    if (!text) {
      throw new Error("No completion received from Bedrock");
    }

    return NextResponse.json({ completion: text });
  } catch (error) {
    console.error("WhatsApp chat error:", error);
    return NextResponse.json(
      { error: "Failed to process WhatsApp chat request" },
      { status: 500 }
    );
  }
}
