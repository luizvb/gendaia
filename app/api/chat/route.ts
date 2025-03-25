import {
  BedrockRuntimeClient,
  ConverseCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/app/lib/business-id";
import { handleToolCalls, ToolUse, ToolResult } from "../../lib/tool-handlers";

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

Ao interagir:
- Colete informações necessárias: nome, telefone, serviço, data/hora, preferência de profissional
- Confirme disponibilidade usando as ferramentas fornecidas
- Peça confirmação antes de finalizar agendamento
- IMPORTANTE: Se o nome e telefone do cliente não foram informados, SEMPRE pergunte essas informações ANTES de tentar validar ou criar o agendamento

IMPORTANTE: 
- Para checkAvailability, validateAppointment e createAppointment, o sistema consegue converter automaticamente nomes para IDs
- Mas SEMPRE é preferível e mais eficiente usar UUIDs/IDs quando disponíveis
- Recomendado: Use listProfessionals/listServices primeiro para obter os IDs

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

ATENDIMENTO AO CLIENTE:
- SEMPRE pergunte o nome e telefone para contato do cliente antes de validar o agendamento
- Esses dados são OBRIGATÓRIOS para criar o agendamento no sistema
- Se o cliente não fornecer espontaneamente, pergunte educadamente: "Para confirmar seu agendamento, preciso do seu nome e telefone para contato. Poderia me informar?"

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

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const supabase = await createClient();
    let businessId: string;

    try {
      const nextReq = new NextRequest(req.url, {
        headers: req.headers,
      });
      businessId = (await getBusinessId(nextReq))!;
    } catch (error) {
      console.error("Authentication error:", error);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

        // Recursivamente chama a API com os resultados das ferramentas
        const newReq = new Request(req.url, {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify({
            messages: [
              ...messages,
              response.output?.message,
              toolResultMessage,
            ],
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
    console.error("Bedrock error:", error);
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
