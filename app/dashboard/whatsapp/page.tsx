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
} from "lucide-react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import QRCode from "react-qr-code";

interface Message {
  id: string;
  business_id: string;
  phone_number: string;
  message: string;
  direction: "incoming" | "outgoing";
  created_at: string;
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

        console.log("Profile data:", profile);

        if (profile?.business_id) {
          console.log("Setting business_id:", profile.business_id);
          setBusinessId(profile.business_id);
          checkStatus(profile.business_id);
          loadMessages(profile.business_id);
        }
      }
    };

    fetchBusinessData();
  }, []);

  const checkStatus = async (id: string) => {
    const { isActive, error } = await whatsappService.getSessionStatus(id);

    if (error) {
      toast({
        title: "Erro ao verificar status",
        description: error,
        variant: "destructive",
      });
      return;
    }

    setIsActive(isActive);
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

  const handleInitSession = async () => {
    console.log("handleInitSession", businessId);

    if (!businessId) {
      console.log("No business ID available");
      toast({
        title: "Erro ao inicializar WhatsApp",
        description: "ID da empresa não encontrado",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    console.log(
      "Calling whatsappService.initSession with businessId:",
      businessId
    );
    const { qrCode, error } = await whatsappService.initSession({ businessId });
    setIsLoading(false);

    if (error) {
      console.log("Error initializing WhatsApp:", error);
      toast({
        title: "Erro ao inicializar WhatsApp",
        description: error,
        variant: "destructive",
      });
      return;
    }

    // O QR code pode vir em diferentes formatos:
    // 1. Uma string base64 completa (data:image/png;base64,...)
    // 2. Uma string base64 sem o prefixo (o serviço adiciona o prefixo)
    // 3. Um texto simples que será convertido em QR code pelo componente QRCode
    console.log("QR Code received:", qrCode ? "Yes" : "No");
    if (qrCode) {
      console.log("QR Code format:", qrCode.substring(0, 30) + "...");
    }
    setQrCode(qrCode);

    // Check status after a delay to see if connection was successful
    setTimeout(() => checkStatus(businessId), 30000);
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

    setIsSending(true);
    const { success, error } = await whatsappService.sendMessage({
      businessId,
      phoneNumber,
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
        className="bg-white rounded-lg shadow-sm border"
      >
        <div className="px-4 pt-4">
          <TabsList className="mb-4 grid w-full grid-cols-2 bg-gray-100 p-1">
            <TabsTrigger
              value="config"
              className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Configuração
            </TabsTrigger>
            <TabsTrigger
              value="messages"
              className="rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Mensagens
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
                <div className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-lg border border-green-100">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
                  <div className="text-green-600 font-semibold text-lg mb-2">
                    WhatsApp conectado!
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    Seu WhatsApp está conectado e pronto para uso.
                  </p>
                </div>
              ) : qrCode ? (
                <div className="flex flex-col items-center justify-center p-6 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="mb-4 text-center">
                    <QrCode className="h-10 w-10 text-blue-500 mx-auto mb-3" />
                    <h3 className="font-medium text-lg mb-2">
                      Escaneie o QR Code
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Abra o WhatsApp no seu celular e escaneie o QR Code abaixo
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-md border border-gray-100 relative">
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
                      />
                    ) : null}
                  </div>
                  <div className="flex items-center mt-4 text-sm text-gray-600">
                    <Smartphone className="h-4 w-4 mr-2 text-gray-500" />
                    <span>Mantenha seu celular próximo para escanear</span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg border border-gray-100">
                  <QrCode className="h-12 w-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 mb-4">
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
                  className="bg-blue-500 hover:bg-blue-600 px-6 py-2 shadow-sm transition-all hover:shadow"
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
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center">
                  <Send className="h-5 w-5 text-blue-500 mr-2" />
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
                      placeholder="Ex: 5511999999999"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Digite o número com código do país e DDD, sem espaços ou
                      caracteres especiais
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
                      className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t bg-gray-50 py-3">
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 shadow-sm transition-all hover:shadow"
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
              <CardHeader className="bg-gray-50 border-b">
                <CardTitle className="flex items-center">
                  <Smartphone className="h-5 w-5 text-blue-500 mr-2" />
                  Histórico de Mensagens
                </CardTitle>
                <CardDescription>
                  Últimas 50 mensagens enviadas e recebidas
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4 max-h-[500px] overflow-y-auto p-2">
                  {messages.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-100">
                      <QrCode className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                      Nenhuma mensagem encontrada
                    </div>
                  ) : (
                    messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-lg shadow-sm border ${
                          msg.direction === "outgoing"
                            ? "bg-blue-50 ml-12 border-blue-100"
                            : "bg-gray-50 mr-12 border-gray-100"
                        }`}
                      >
                        <div className="flex justify-between mb-1">
                          <span
                            className={`text-xs font-medium ${
                              msg.direction === "outgoing"
                                ? "text-blue-600"
                                : "text-gray-600"
                            }`}
                          >
                            {msg.direction === "outgoing"
                              ? "Enviado para"
                              : "Recebido de"}
                            : {msg.phone_number}
                          </span>
                          <span className="text-xs text-gray-500">
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
      </Tabs>
    </div>
  );
}
