"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase";
import { normalizePhoneNumber } from "@/lib/utils";

interface UseWhatsAppSessionProps {
  businessId: string | null;
}

export function useWhatsAppSession({ businessId }: UseWhatsAppSessionProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string | null>(null);
  const [userPhoneNumber, setUserPhoneNumber] = useState("");
  const [isCreatingInstance, setIsCreatingInstance] = useState(false);
  const [instanceCreated, setInstanceCreated] = useState(false);
  const [isDeletingInstance, setIsDeletingInstance] = useState(false);
  const { toast } = useToast();

  const checkSessionStatus = useCallback(
    async (id: string) => {
      if (!id) return;
      setSessionStatus(null);
      setIsLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from("whatsapp_sessions")
        .select("*")
        .eq("business_id", id)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error fetching session status:", error);
        toast({
          title: "Erro ao verificar status",
          description: "Não foi possível obter o status da sessão.",
          variant: "destructive",
        });
        setSessionStatus("error");
        setIsActive(false);
        setInstanceCreated(false);
      } else if (data && data.length > 0) {
        const currentStatus = data[0].status?.toUpperCase();
        setSessionStatus(currentStatus);
        setIsActive(currentStatus === "CONNECTED" || currentStatus === "OPEN");
        setInstanceCreated(true);
        if (currentStatus !== "CONNECTED" && currentStatus !== "OPEN") {
          setQrCode(null);
        }
      } else {
        setSessionStatus("NOT_FOUND");
        setIsActive(false);
        setInstanceCreated(false);
        setQrCode(null);
      }
      setIsLoading(false);
    },
    [toast]
  );

  const handleInitSession = useCallback(async () => {
    if (!businessId) {
      toast({
        title: "Erro",
        description: "ID da empresa não encontrado.",
        variant: "destructive",
      });
      return;
    }

    const normalizedPhone = normalizePhoneNumber(userPhoneNumber);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      toast({
        title: "Número Inválido",
        description:
          "Por favor, insira um número de WhatsApp válido com código do país e DDD.",
        variant: "destructive",
      });
      return;
    }

    setIsCreatingInstance(true);
    setIsLoading(true);

    try {
      const createInstanceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_GENDAIA_EXTERNAL_URL}/api/evolution/instances`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            instanceName: businessId,
            businessId: businessId,
            number: normalizedPhone,
          }),
        }
      );

      if (!createInstanceResponse.ok) {
        const errorData = await createInstanceResponse.json();
        throw new Error(
          `Falha ao criar instância: ${
            errorData.message || createInstanceResponse.statusText
          }`
        );
      }

      toast({
        title: "Instância Criada",
        description:
          "Instância do WhatsApp criada com sucesso. Clique em Conectar para obter o QR Code.",
      });
      setInstanceCreated(true);
      setQrCode(null);
    } catch (error: any) {
      console.error("Erro ao criar instância:", error);
      toast({
        title: "Erro ao criar instância",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      setInstanceCreated(false);
    } finally {
      setIsCreatingInstance(false);
      setIsLoading(false);
    }
  }, [businessId, userPhoneNumber, toast]);

  const updateInstanceStatusToConnected = useCallback(
    async (id: string) => {
      if (!id) return;
      try {
        const updateStatusResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_GENDAIA_EXTERNAL_URL}/api/evolution/instances/${id}/status`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "CONNECTED" }),
          }
        );
        if (!updateStatusResponse.ok) {
          const errorData = await updateStatusResponse.json();
          console.error(
            "Failed to update instance status to CONNECTED:",
            errorData
          );
          toast({
            title: "Erro ao finalizar",
            description: "Não foi possível atualizar o status da conexão.",
            variant: "destructive",
          });
        } else {
          console.log("Instance status updated to CONNECTED");
          setTimeout(() => checkSessionStatus(id), 1000);
        }
      } catch (statusUpdateError) {
        console.error("Error updating instance status:", statusUpdateError);
        toast({
          title: "Erro ao finalizar",
          description: "Não foi possível atualizar o status da conexão.",
          variant: "destructive",
        });
      }
    },
    [toast, checkSessionStatus]
  );

  const handleConnect = useCallback(async () => {
    if (!businessId) return;

    const wasQrCodeAlreadyPresent = Boolean(qrCode);
    setIsLoading(true);
    if (!wasQrCodeAlreadyPresent) {
      setQrCode(null);
    }

    try {
      const connectResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_GENDAIA_EXTERNAL_URL}/api/evolution/instances/${businessId}/connect`,
        {
          method: "GET",
        }
      );

      if (!connectResponse.ok) {
        const errorData = await connectResponse.json();
        throw new Error(
          `Falha ao obter QR Code: ${
            errorData.message || connectResponse.statusText
          }`
        );
      }

      const connectData = await connectResponse.json();
      const receivedQrCode = connectData?.connection?.base64;

      if (
        receivedQrCode &&
        typeof receivedQrCode === "string" &&
        receivedQrCode.startsWith("data:image/png;base64,")
      ) {
        if (!wasQrCodeAlreadyPresent || qrCode !== receivedQrCode) {
          setQrCode(receivedQrCode);
          toast({
            title: "QR Code Recebido",
            description: "Escaneie o QR Code com seu WhatsApp.",
          });
        } else {
          toast({
            title: "Finalizando Conexão...",
            description: "Aguarde enquanto verificamos a conexão.",
          });
        }

        if (wasQrCodeAlreadyPresent) {
          await updateInstanceStatusToConnected(businessId);
        }

        if (!wasQrCodeAlreadyPresent) {
          setTimeout(() => checkSessionStatus(businessId), 30000);
        }
      } else {
        if (wasQrCodeAlreadyPresent) {
          console.log(
            "No new QR code received, assuming connection is establishing/established."
          );
          await updateInstanceStatusToConnected(businessId);
          setTimeout(() => checkSessionStatus(businessId), 5000);
        } else {
          throw new Error(
            "QR Code (base64) não recebido ou em formato inválido na resposta da API."
          );
        }
      }
    } catch (error: any) {
      console.error("Erro ao conectar/obter QR Code:", error);
      toast({
        title: "Erro ao conectar/obter QR Code",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
      setQrCode(null);
    } finally {
      setIsLoading(false);
    }
  }, [
    businessId,
    qrCode,
    toast,
    updateInstanceStatusToConnected,
    checkSessionStatus,
  ]);

  const handleDisconnect = useCallback(async () => {
    if (!businessId) return;

    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_GENDAIA_EXTERNAL_URL}/api/evolution/instances/${businessId}/logout`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Falha ao desconectar: ${errorData.message || response.statusText}`
        );
      }

      setIsActive(false);
      setQrCode(null);
      setUserPhoneNumber("");
      setSessionStatus("CLOSE");
      setInstanceCreated(true);
      toast({
        title: "WhatsApp Desconectado",
        description: "Sessão encerrada com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao desconectar WhatsApp:", error);
      toast({
        title: "Erro ao desconectar WhatsApp",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [businessId, toast, checkSessionStatus]);

  const handleDeleteInstance = useCallback(async () => {
    if (!businessId) return;

    setIsDeletingInstance(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_GENDAIA_EXTERNAL_URL}/api/evolution/instances/${businessId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          console.log("Instance already deleted or not found on server.");
        } else {
          const errorData = await response.json();
          throw new Error(
            `Falha ao deletar instância: ${
              errorData.message || response.statusText
            }`
          );
        }
      }

      setInstanceCreated(false);
      setIsActive(false);
      setQrCode(null);
      setSessionStatus("NOT_FOUND");
      setUserPhoneNumber("");

      toast({
        title: "Instância Deletada",
        description: "A instância do WhatsApp foi removida com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao deletar instância:", error);
      toast({
        title: "Erro ao deletar instância",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingInstance(false);
    }
  }, [businessId, toast]);

  return {
    qrCode,
    isLoading,
    isActive,
    sessionStatus,
    userPhoneNumber,
    setUserPhoneNumber,
    isCreatingInstance,
    instanceCreated,
    isDeletingInstance,
    checkSessionStatus,
    handleInitSession,
    handleConnect,
    handleDisconnect,
    handleDeleteInstance,
  };
}
