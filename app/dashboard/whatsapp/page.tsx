"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppService } from "@/lib/services/whatsapp-service";
import { createClient } from "@/lib/supabase";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  RefreshCw,
  Send,
  QrCode,
  CheckCircle2,
  Smartphone,
  Bell,
  Settings,
  Bot,
} from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import QRCode from "react-qr-code";
import { formatPhoneNumber, normalizePhoneNumber } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  id: string;
  business_id: string;
  phone_number: string;
  message: string;
  direction: "incoming" | "outgoing";
  created_at: string;
}

interface NotificationPreferences {
  appointment_confirmation: boolean;
  appointment_reminder: boolean;
  follow_up_message: boolean;
  appointment_update: boolean;
  appointment_cancellation: boolean;
}

interface AgentSettings {
  enabled: boolean;
  name: string;
  personality: string;
  description: string;
  data_collection: boolean;
  auto_booking: boolean;
  delay_response: boolean;
  topic_restriction: boolean;
  allowed_topics: string;
}

export default function WhatsAppPage() {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [messageText, setMessageText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingPreferences, setIsLoadingPreferences] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [isSavingAgentSettings, setIsSavingAgentSettings] = useState(false);
  const [agentSettings, setAgentSettings] = useState<AgentSettings>({
    enabled: false,
    name: "Luiza",
    personality: "professional",
    description:
      "Sou especialista em agendamento de serviços. Posso ajudar com dúvidas sobre serviços, profissionais e disponibilidade de horários.",
    data_collection: true,
    auto_booking: false,
    delay_response: true,
    topic_restriction: true,
    allowed_topics: "agendamento de serviços",
  });
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>({
      appointment_confirmation: true,
      appointment_reminder: false,
      follow_up_message: false,
      appointment_update: true,
      appointment_cancellation: true,
    });
  const { toast } = useToast();
  const whatsappService = new WhatsAppService();

  useEffect(() => {
    const fetchBusinessData = async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        // Obter o business_id diretamente do perfil do usuário
        const { data: profile } = await supabase
          .from("profiles")
          .select("business_id")
          .eq("user_id", session.user.id)
          .single();

        if (profile?.business_id) {
          setBusinessId(profile.business_id);
          checkSessionStatus(profile.business_id);
          loadMessages(profile.business_id);
          loadNotificationPreferences(profile.business_id);
          loadAgentSettings(profile.business_id);
        }
      }
    };

    fetchBusinessData();
  }, []);

  const checkSessionStatus = async (id: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from("whatsapp_sessions")
      .select("*")
      .eq("business_id", id)
      .order("updated_at", { ascending: false })
      .limit(1);

    // If there's data and status is connected, set isActive to true
    setIsActive(!!(data && data.length > 0 && data[0].status === "CONNECTED"));
  };

  const loadMessages = async (id: string) => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("business_id", id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Erro ao carregar mensagens",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setMessages(data || []);

    // Subscribe to new messages
    whatsappService.subscribeToMessages(id, (newMessage) => {
      setMessages((prev) => [newMessage, ...prev]);
    });
  };

  const loadNotificationPreferences = async (id: string) => {
    setIsLoadingPreferences(true);
    try {
      const response = await fetch(`/api/notifications/preferences`);
      if (!response.ok) {
        throw new Error("Failed to load notification preferences");
      }
      const data = await response.json();
      setNotificationPreferences(data);
    } catch (error) {
      console.error("Error loading notification preferences:", error);
      toast({
        title: "Erro ao carregar preferências",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsLoadingPreferences(false);
    }
  };

  const loadAgentSettings = async (id: string) => {
    try {
      setIsSavingAgentSettings(true);
      const response = await fetch(`/api/chat/agent-settings`);
      if (!response.ok) {
        throw new Error("Failed to load agent settings");
      }
      const data = await response.json();
      setAgentSettings(data);
    } catch (error) {
      console.error("Error loading agent settings:", error);
      toast({
        title: "Erro ao carregar configurações do agente",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSavingAgentSettings(false);
    }
  };

  const saveNotificationPreferences = async () => {
    if (!businessId) return;

    setIsSavingPreferences(true);
    try {
      const response = await fetch(`/api/notifications/preferences`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(notificationPreferences),
      });

      if (!response.ok) {
        throw new Error("Failed to save notification preferences");
      }

      toast({
        title: "Preferências salvas",
        description:
          "Suas preferências de notificação foram salvas com sucesso",
      });
    } catch (error) {
      console.error("Error saving notification preferences:", error);
      toast({
        title: "Erro ao salvar preferências",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  const handleInitSession = async () => {
    if (!businessId) {
      toast({
        title: "Erro ao inicializar WhatsApp",
        description: "ID da empresa não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    const { qrCode, error } = await whatsappService.initSession({ businessId });
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao inicializar WhatsApp",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setQrCode(qrCode);

    // Check status after a delay to see if connection was successful
    setTimeout(() => checkSessionStatus(businessId), 30000);
  };

  const handleDisconnect = async () => {
    if (!businessId) return;

    setIsLoading(true);
    const { success, error } = await whatsappService.disconnectSession(
      businessId
    );
    setIsLoading(false);

    if (error) {
      toast({
        title: "Erro ao desconectar WhatsApp",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setIsActive(false);
    setQrCode(null);

    toast({
      title: "WhatsApp desconectado",
      description: "Sessão encerrada com sucesso",
    });
  };

  const handleSendMessage = async () => {
    if (!businessId || !phoneNumber || !messageText) return;

    // Normalize phone number before sending to API
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    setIsSending(true);
    const { success, error } = await whatsappService.sendMessage({
      businessId,
      phoneNumber: normalizedPhone,
      message: messageText,
    });
    setIsSending(false);

    if (error) {
      toast({
        title: "Erro ao enviar mensagem",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setMessageText("");

    toast({
      title: "Mensagem enviada",
      description: "Mensagem enviada com sucesso",
    });
  };

  const saveAgentSettings = async () => {
    if (!businessId) return;

    setIsSavingAgentSettings(true);
    try {
      const response = await fetch(`/api/chat/agent-settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(agentSettings),
      });

      if (!response.ok) {
        throw new Error("Failed to save agent settings");
      }

      toast({
        title: "Configurações salvas",
        description:
          "As configurações do agente de IA foram salvas com sucesso",
      });
    } catch (error) {
      console.error("Error saving agent settings:", error);
      toast({
        title: "Erro ao salvar configurações",
        description:
          error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsSavingAgentSettings(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center mb-6">
        <div className="bg-green-500 p-2 rounded-lg mr-3">
          <Smartphone className="h-6 w-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold">WhatsApp</h1>
      </div>

      <Tabs
        defaultValue="config"
        className="bg-card rounded-lg shadow-sm border"
      >
        <div className="px-4 pt-4">
          <TabsList className="mb-4 grid w-full grid-cols-4 p-1">
            <TabsTrigger value="config" className="rounded-md">
              <QrCode className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="messages" className="rounded-md">
              <Send className="h-4 w-4 mr-2" />
              Mensagens
            </TabsTrigger>
            <TabsTrigger value="agent" className="rounded-md">
              <Bot className="h-4 w-4 mr-2" />
              Agente de IA
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-md">
              <Bell className="h-4 w-4 mr-2" />
              Notificações
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do WhatsApp</CardTitle>
              <CardDescription>
                Configure a integração do WhatsApp para sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isActive ? (
                <div className="flex flex-col items-center justify-center p-6 bg-green-500/10 dark:bg-green-500/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <div className="text-green-600 dark:text-green-400 font-semibold text-lg mb-2">
                    WhatsApp conectado!
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    Seu WhatsApp está conectado e pronto para uso.
                  </p>
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center justify-center p-6 bg-blue-500/10 dark:bg-blue-500/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="mb-4 text-center">
                    <QrCode className="h-10 w-10 text-blue-500 dark:text-blue-400 mx-auto mb-3" />
                    <h3 className="font-medium text-lg mb-2">
                      Escaneie o QR Code
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Abra o WhatsApp no seu celular e escaneie o QR Code abaixo
                    </p>
                  </div>
                  <div className="bg-background p-4 rounded-lg shadow-md border border-border relative">
                    <div className="absolute -top-2 -left-2 w-4 h-4 bg-blue-500 rounded-full"></div>
                    <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-500 rounded-full"></div>
                    <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-blue-500 rounded-full"></div>
                    <div className="absolute -bottom-2 -right-2 w-4 h-4 bg-blue-500 rounded-full"></div>
                    {qrCode && qrCode.startsWith("data:image") ? (
                      <Image
                        src={qrCode}
                        alt="WhatsApp QR Code"
                        width={250}
                        height={250}
                        className="rounded"
                        unoptimized
                      />
                    ) : qrCode ? (
                      <QRCode
                        value={qrCode}
                        size={250}
                        style={{
                          height: "auto",
                          maxWidth: "100%",
                          width: "100%",
                        }}
                        viewBox={`0 0 256 256`}
                        bgColor={"transparent"}
                        fgColor={"currentColor"}
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center mt-4 text-sm text-muted-foreground">
                    <Smartphone className="h-4 w-4 mr-2" />
                    <span>Mantenha seu celular próximo para escanear</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg border border-border">
                  <QrCode className="h-12 w-12 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Clique no botão abaixo para configurar o WhatsApp para sua
                    empresa
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-center">
              {isActive ? (
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="px-6 py-2 shadow-sm transition-all hover:shadow"
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Desconectar WhatsApp
                </Button>
              ) : (
                <Button
                  onClick={handleInitSession}
                  disabled={isLoading}
                  className="px-6 py-2 shadow-sm transition-all hover:shadow"
                >
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : qrCode ? (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  ) : (
                    <QrCode className="mr-2 h-4 w-4" />
                  )}
                  {qrCode ? "Gerar novo QR Code" : "Configurar WhatsApp"}
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="messages">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="flex items-center">
                  <Send className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                  Enviar Mensagem
                </CardTitle>
                <CardDescription>
                  Envie uma mensagem para um número de WhatsApp
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Número de Telefone
                    </label>
                    <Input
                      placeholder="Ex: +55 (11) 99999-9999"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(formatPhoneNumber(e.target.value))
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Digite o número com código do país e DDD
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      Mensagem
                    </label>
                    <Textarea
                      placeholder="Digite sua mensagem aqui..."
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      rows={5}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-muted/50 py-3">
                <Button
                  className="w-full shadow-sm transition-all hover:shadow"
                  onClick={handleSendMessage}
                  disabled={
                    !isActive || isSending || !phoneNumber || !messageText
                  }
                >
                  {isSending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Enviar Mensagem
                </Button>
              </CardFooter>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="bg-muted/50 border-b">
                <CardTitle className="flex items-center">
                  <Smartphone className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                  Histórico de Mensagens
                </CardTitle>
                <CardDescription>
                  Últimas 50 mensagens enviadas e recebidas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground bg-muted rounded-lg border border-border">
                      <QrCode className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      Nenhuma mensagem encontrada
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg shadow-sm border ${
                          msg.direction === "outgoing"
                            ? "bg-blue-500/10 dark:bg-blue-500/20 ml-12 border-blue-200 dark:border-blue-800"
                            : "bg-muted mr-12 border-border"
                        }`}
                      >
                        <div className="flex justify-between mb-1">
                          <span
                            className={`text-xs font-medium ${
                              msg.direction === "outgoing"
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-foreground"
                            }`}
                          >
                            {msg.direction === "outgoing"
                              ? "Enviado para"
                              : "Recebido de"}
                            : {formatPhoneNumber(msg.phone_number)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="agent">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                Configuração do Agente de IA
              </CardTitle>
              <CardDescription>
                Personalize como o agente de IA interage com seus clientes via
                WhatsApp
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border rounded-lg p-4 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="font-medium">Habilitar Agente de IA</div>
                      <p className="text-sm text-muted-foreground">
                        Quando ativado, o agente de IA responderá
                        automaticamente às mensagens recebidas
                      </p>
                    </div>
                    <Switch
                      checked={agentSettings.enabled}
                      onCheckedChange={(checked) =>
                        setAgentSettings((prev) => ({
                          ...prev,
                          enabled: checked,
                        }))
                      }
                      disabled={!isActive || isSavingAgentSettings}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Perfil do Agente</h3>

                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="agent-name">Nome do Agente</Label>
                      <Input
                        id="agent-name"
                        placeholder="Ex: Luiza, Carlos, Ana..."
                        value={agentSettings.name}
                        onChange={(e) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        disabled={
                          !agentSettings.enabled || isSavingAgentSettings
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agent-persona">Personalidade</Label>
                      <Select
                        value={agentSettings.personality}
                        onValueChange={(value) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            personality: value,
                          }))
                        }
                        disabled={
                          !agentSettings.enabled || isSavingAgentSettings
                        }
                      >
                        <SelectTrigger id="agent-persona">
                          <SelectValue placeholder="Selecione uma personalidade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="professional">
                            Profissional e Formal
                          </SelectItem>
                          <SelectItem value="friendly">
                            Amigável e Descontraído
                          </SelectItem>
                          <SelectItem value="enthusiastic">
                            Entusiasmado e Energético
                          </SelectItem>
                          <SelectItem value="helpful">
                            Prestativo e Atencioso
                          </SelectItem>
                          <SelectItem value="empathetic">
                            Empático e Compreensivo
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="agent-description">
                        Descrição Personalizada
                      </Label>
                      <Textarea
                        id="agent-description"
                        placeholder="Descreva a personalidade e o estilo de comunicação do seu agente..."
                        value={agentSettings.description}
                        onChange={(e) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={4}
                        disabled={
                          !agentSettings.enabled || isSavingAgentSettings
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Descreva como seu agente deve se comunicar, suas
                        características de personalidade e comportamento.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Comportamento do Agente
                  </h3>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">Coleta de Dados</div>
                        <p className="text-sm text-muted-foreground">
                          O agente coletará informações como nome e telefone
                          automaticamente
                        </p>
                      </div>
                      <Switch
                        checked={agentSettings.data_collection}
                        onCheckedChange={(checked) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            data_collection: checked,
                          }))
                        }
                        disabled={
                          !agentSettings.enabled || isSavingAgentSettings
                        }
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          Agendamento Automático
                        </div>
                        <p className="text-sm text-muted-foreground">
                          O agente pode criar agendamentos sem aprovação manual
                        </p>
                      </div>
                      <Switch
                        checked={agentSettings.auto_booking}
                        onCheckedChange={(checked) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            auto_booking: checked,
                          }))
                        }
                        disabled={
                          !agentSettings.enabled || isSavingAgentSettings
                        }
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">Tempo de Resposta</div>
                        <p className="text-sm text-muted-foreground">
                          Adiciona um atraso na resposta para parecer mais
                          natural
                        </p>
                      </div>
                      <Switch
                        checked={agentSettings.delay_response}
                        onCheckedChange={(checked) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            delay_response: checked,
                          }))
                        }
                        disabled={
                          !agentSettings.enabled || isSavingAgentSettings
                        }
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">Restrição de Assunto</div>
                        <p className="text-sm text-muted-foreground">
                          Limita o agente a falar apenas sobre os assuntos
                          permitidos
                        </p>
                      </div>
                      <Switch
                        checked={agentSettings.topic_restriction}
                        onCheckedChange={(checked) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            topic_restriction: checked,
                          }))
                        }
                        disabled={
                          !agentSettings.enabled || isSavingAgentSettings
                        }
                      />
                    </div>
                  </div>

                  {agentSettings.topic_restriction && (
                    <div className="space-y-2">
                      <Label htmlFor="allowed-topics">
                        Assuntos Permitidos
                      </Label>
                      <Textarea
                        id="allowed-topics"
                        placeholder="Ex: agendamento de serviços, horários disponíveis, preços..."
                        value={agentSettings.allowed_topics}
                        onChange={(e) =>
                          setAgentSettings((prev) => ({
                            ...prev,
                            allowed_topics: e.target.value,
                          }))
                        }
                        rows={3}
                        disabled={
                          !agentSettings.enabled || isSavingAgentSettings
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Lista de assuntos separados por vírgula que o agente
                        pode discutir. Qualquer outro assunto será recusado
                        educadamente.
                      </p>
                    </div>
                  )}
                </div>

                <div className="bg-yellow-500/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <Settings className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-600 dark:text-yellow-400">
                        Comportamento do Agente
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        O agente de IA responderá automaticamente às mensagens
                        recebidas no WhatsApp quando estiver habilitado.
                        Certifique-se de que seu WhatsApp esteja conectado para
                        que o agente funcione corretamente.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t bg-muted/50 pt-4">
              <Button
                onClick={saveAgentSettings}
                disabled={isSavingAgentSettings || !isActive}
                className="w-full"
              >
                {isSavingAgentSettings ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bot className="mr-2 h-4 w-4" />
                )}
                Salvar Configurações do Agente
              </Button>
              {!isActive && (
                <p className="text-xs text-muted-foreground mt-2">
                  Para usar o agente de IA, conecte seu WhatsApp primeiro.
                </p>
              )}
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 text-blue-500 dark:text-blue-400 mr-2" />
                Preferências de Notificação
              </CardTitle>
              <CardDescription>
                Configure como e quando enviar notificações automáticas para
                seus clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingPreferences ? (
                <div className="py-10 flex justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          Confirmação de Agendamento
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Envia uma mensagem para o cliente assim que um
                          agendamento é realizado
                        </p>
                      </div>
                      <Switch
                        checked={
                          notificationPreferences.appointment_confirmation
                        }
                        onCheckedChange={(checked) =>
                          setNotificationPreferences((prev) => ({
                            ...prev,
                            appointment_confirmation: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          Lembrete de Agendamento
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Envia um lembrete 1 hora antes do horário agendado
                        </p>
                      </div>
                      <Switch
                        checked={notificationPreferences.appointment_reminder}
                        onCheckedChange={(checked) =>
                          setNotificationPreferences((prev) => ({
                            ...prev,
                            appointment_reminder: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          Mensagem de Acompanhamento
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Envia uma mensagem 15 dias após o atendimento,
                          perguntando se o cliente deseja agendar novamente
                        </p>
                      </div>
                      <Switch
                        checked={notificationPreferences.follow_up_message}
                        onCheckedChange={(checked) =>
                          setNotificationPreferences((prev) => ({
                            ...prev,
                            follow_up_message: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          Atualização de Agendamento
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Envia uma mensagem quando um agendamento é atualizado
                          (data, hora, serviço ou profissional)
                        </p>
                      </div>
                      <Switch
                        checked={notificationPreferences.appointment_update}
                        onCheckedChange={(checked) =>
                          setNotificationPreferences((prev) => ({
                            ...prev,
                            appointment_update: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 bg-muted/10">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="font-medium">
                          Cancelamento de Agendamento
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Envia uma mensagem quando um agendamento é cancelado
                        </p>
                      </div>
                      <Switch
                        checked={
                          notificationPreferences.appointment_cancellation
                        }
                        onCheckedChange={(checked) =>
                          setNotificationPreferences((prev) => ({
                            ...prev,
                            appointment_cancellation: checked,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex gap-3">
                      <Settings className="h-5 w-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-yellow-600 dark:text-yellow-400">
                          Notificações Automáticas
                        </h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          As notificações automáticas dependem que seu WhatsApp
                          esteja conectado. O sistema verificará automaticamente
                          os agendamentos e enviará notificações de acordo com
                          suas preferências.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="border-t bg-muted/50 pt-4">
              <Button
                onClick={saveNotificationPreferences}
                disabled={isSavingPreferences || !isActive}
                className="w-full"
              >
                {isSavingPreferences ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Bell className="mr-2 h-4 w-4" />
                )}
                Salvar Preferências
              </Button>
              {!isActive && (
                <p className="text-xs text-muted-foreground mt-2">
                  Para usar notificações automáticas, conecte seu WhatsApp
                  primeiro.
                </p>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
