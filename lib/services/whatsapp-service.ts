import { createClient } from "@/lib/supabase";

interface SendMessageParams {
  businessId: string;
  phoneNumber: string;
  message: string;
}

interface InitSessionParams {
  businessId: string;
}

export class WhatsAppService {
  private readonly WHATSAPP_SERVER_URL =
    process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || "http://localhost:3001";

  constructor() {
    console.log(
      "WhatsAppService initialized with URL:",
      this.WHATSAPP_SERVER_URL
    );
  }

  async initSession({ businessId }: InitSessionParams): Promise<{
    qrCode: string | null;
    error: string | null;
  }> {
    try {
      console.log("Using direct HTTP request to WhatsApp server");
      const response = await fetch(`${this.WHATSAPP_SERVER_URL}/init-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to initialize WhatsApp session: ${response.statusText}`
        );
      }

      const data = await response.json();

      // Se o QR code for uma string base64, precisamos convertê-lo para um formato que o react-qr-code possa usar
      // Se o servidor já estiver enviando um texto para o QR code, podemos usá-lo diretamente
      let qrCodeValue = data.qrCode;

      // Verificar se o QR code é uma imagem base64 ou um texto
      if (qrCodeValue && qrCodeValue.startsWith("data:image")) {
        // Se for uma imagem base64 completa (com prefixo data:image), podemos usá-la diretamente com o componente Image
        console.log("QR code is a complete base64 image");
        return { qrCode: qrCodeValue, error: null };
      } else if (qrCodeValue && /^[A-Za-z0-9+/=]+$/.test(qrCodeValue)) {
        // Se for apenas base64 sem prefixo, adicionamos o prefixo
        console.log("QR code is raw base64, adding prefix");
        return { qrCode: `data:image/png;base64,${qrCodeValue}`, error: null };
      } else if (qrCodeValue) {
        // Se for apenas o texto do QR code, podemos usar diretamente com o componente QRCode
        console.log("QR code is text, using directly");
        return { qrCode: qrCodeValue, error: null };
      }

      return { qrCode: data.qrCode, error: null };
    } catch (error) {
      console.error("Error initializing WhatsApp session:", error);
      return {
        qrCode: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async disconnectSession(
    businessId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${this.WHATSAPP_SERVER_URL}/disconnect`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to disconnect WhatsApp session: ${response.statusText}`
        );
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Error disconnecting WhatsApp session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendMessage({
    businessId,
    phoneNumber,
    message,
  }: SendMessageParams): Promise<{ success: boolean; error: string | null }> {
    try {
      const response = await fetch(`${this.WHATSAPP_SERVER_URL}/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId, phoneNumber, message }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to send WhatsApp message: ${response.statusText}`
        );
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Error sending WhatsApp message:");
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSessionStatus(
    businessId: string
  ): Promise<{ isActive: boolean; error: string | null }> {
    try {
      const response = await fetch(`${this.WHATSAPP_SERVER_URL}/status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ businessId }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to get WhatsApp status: ${response.statusText}`
        );
      }

      const data = await response.json();
      return { isActive: data.isActive, error: null };
    } catch (error) {
      console.error("Error getting WhatsApp status:", error);
      return {
        isActive: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Method to listen for incoming messages
  async subscribeToMessages(
    businessId: string,
    callback: (message: any) => void
  ): Promise<{ unsubscribe: () => void }> {
    const supabase = createClient();

    // Subscribe to the WhatsApp messages channel for this business
    const subscription = supabase
      .channel(`whatsapp-messages-${businessId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "whatsapp_messages",
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => {
        subscription.unsubscribe();
      },
    };
  }
}
