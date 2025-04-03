import { WhatsAppService } from "./whatsapp-service";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { normalizePhoneNumber } from "@/lib/utils";

export interface NotificationPreferences {
  appointment_confirmation: boolean;
  appointment_reminder: boolean;
  follow_up_message: boolean;
  appointment_update: boolean;
  appointment_cancellation: boolean;
}

export class NotificationService {
  private whatsAppService: WhatsAppService;
  private readonly timeZone = "America/Sao_Paulo";

  constructor() {
    this.whatsAppService = new WhatsAppService();
  }

  async sendAppointmentConfirmation(
    businessId: string,
    appointmentData: any
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = await createClient();

      // Get client phone number
      const { data: client } = await supabase
        .from("clients")
        .select("phone, name")
        .eq("id", appointmentData.client_id)
        .single();

      if (!client?.phone) {
        return {
          success: false,
          error: "Client phone number not found",
        };
      }

      // Get service details
      const { data: service } = await supabase
        .from("services")
        .select("name, duration, price")
        .eq("id", appointmentData.service_id)
        .single();

      // Get professional name
      const { data: professional } = await supabase
        .from("professionals")
        .select("name")
        .eq("id", appointmentData.professional_id)
        .single();

      if (!service || !professional) {
        return {
          success: false,
          error: "Service or professional not found",
        };
      }

      // Format date and time with São Paulo timezone
      const appointmentDate = toZonedTime(
        new Date(appointmentData.start_time),
        this.timeZone
      );
      const formattedDate = format(appointmentDate, "dd/MM/yyyy");
      const formattedTime = format(appointmentDate, "HH:mm");

      // Build confirmation message
      const message = `Olá ${client.name}! 
      
Seu agendamento foi confirmado:

📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}
👤 Profissional: ${professional.name}
💇 Serviço: ${service.name}
⏱️ Duração: ${service.duration} minutos
💰 Valor: R$ ${service.price.toFixed(2)}

Aguardamos você!`;

      // Send WhatsApp message
      return await this.whatsAppService.sendMessage({
        businessId,
        phoneNumber: normalizePhoneNumber(client.phone),
        message,
      });
    } catch (error) {
      console.error("Error sending appointment confirmation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendAppointmentUpdate(
    businessId: string,
    appointmentData: any,
    previousData?: {
      start_time?: string;
      professional_id?: string;
      service_id?: string;
    }
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = await createClient();

      // Get client phone number
      const { data: client } = await supabase
        .from("clients")
        .select("phone, name")
        .eq("id", appointmentData.client_id)
        .single();

      if (!client?.phone) {
        return {
          success: false,
          error: "Client phone number not found",
        };
      }

      // Get service details
      const { data: service } = await supabase
        .from("services")
        .select("name, duration, price")
        .eq("id", appointmentData.service_id)
        .single();

      // Get professional name
      const { data: professional } = await supabase
        .from("professionals")
        .select("name")
        .eq("id", appointmentData.professional_id)
        .single();

      if (!service || !professional) {
        return {
          success: false,
          error: "Service or professional not found",
        };
      }

      // Format date and time with São Paulo timezone
      const appointmentDate = toZonedTime(
        new Date(appointmentData.start_time),
        this.timeZone
      );
      const formattedDate = format(appointmentDate, "dd/MM/yyyy");
      const formattedTime = format(appointmentDate, "HH:mm");

      // Build update message
      const message = `Olá ${client.name}! 
      
Seu agendamento foi atualizado:

📅 Data: ${formattedDate}
⏰ Horário: ${formattedTime}
👤 Profissional: ${professional.name}
💇 Serviço: ${service.name}
⏱️ Duração: ${service.duration} minutos
💰 Valor: R$ ${service.price.toFixed(2)}

Em caso de dúvidas, entre em contato conosco.
Aguardamos você!`;

      // Send WhatsApp message
      return await this.whatsAppService.sendMessage({
        businessId,
        phoneNumber: normalizePhoneNumber(client.phone),
        message,
      });
    } catch (error) {
      console.error("Error sending appointment update:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendAppointmentCancellation(
    businessId: string,
    appointmentData: any
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = await createClient();

      // Get client phone number
      const { data: client } = await supabase
        .from("clients")
        .select("phone, name")
        .eq("id", appointmentData.client_id)
        .single();

      if (!client?.phone) {
        return {
          success: false,
          error: "Client phone number not found",
        };
      }

      // Get service details
      const { data: service } = await supabase
        .from("services")
        .select("name")
        .eq("id", appointmentData.service_id)
        .single();

      // Format date and time with São Paulo timezone
      const appointmentDate = toZonedTime(
        new Date(appointmentData.start_time),
        this.timeZone
      );
      const formattedDate = format(appointmentDate, "dd/MM/yyyy");
      const formattedTime = format(appointmentDate, "HH:mm");

      // Build cancellation message
      const message = `Olá ${client.name}! 
      
Seu agendamento para ${
        service?.name || "serviço"
      } no dia ${formattedDate} às ${formattedTime} foi cancelado.

Se desejar reagendar, entre em contato conosco ou acesse nosso site.

Agradecemos a compreensão.`;

      // Send WhatsApp message
      return await this.whatsAppService.sendMessage({
        businessId,
        phoneNumber: normalizePhoneNumber(client.phone),
        message,
      });
    } catch (error) {
      console.error("Error sending appointment cancellation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendAppointmentReminder(
    businessId: string,
    appointmentId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = await createClient();

      // Get appointment details with related data
      const { data: appointment } = await supabase
        .from("appointments")
        .select(
          `
          *,
          clients:client_id (name, phone),
          professionals:professional_id (name),
          services:service_id (name)
        `
        )
        .eq("id", appointmentId)
        .single();

      if (!appointment || !appointment.clients?.phone) {
        return {
          success: false,
          error: "Appointment or client phone not found",
        };
      }

      // Format date and time with São Paulo timezone
      const appointmentDate = toZonedTime(
        new Date(appointment.start_time),
        this.timeZone
      );
      const formattedTime = format(appointmentDate, "HH:mm");

      // Build reminder message
      const message = `Olá ${appointment.clients.name}! 
      
Lembrete: você tem um agendamento em 1 hora.

⏰ Horário: ${formattedTime}
👤 Profissional: ${appointment.professionals.name}
💇 Serviço: ${appointment.services.name}

Contamos com sua presença!`;

      // Send WhatsApp message
      return await this.whatsAppService.sendMessage({
        businessId,
        phoneNumber: normalizePhoneNumber(appointment.clients.phone),
        message,
      });
    } catch (error) {
      console.error("Error sending appointment reminder:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async sendFollowUpMessage(
    businessId: string,
    appointmentId: string
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = await createClient();

      // Get appointment details with related data
      const { data: appointment } = await supabase
        .from("appointments")
        .select(
          `
          *,
          clients:client_id (name, phone),
          services:service_id (name)
        `
        )
        .eq("id", appointmentId)
        .single();

      if (!appointment || !appointment.clients?.phone) {
        return {
          success: false,
          error: "Appointment or client phone not found",
        };
      }

      // Build follow-up message
      const message = `Olá ${appointment.clients.name}! 
      
Já faz 15 dias desde seu último serviço (${appointment.services.name}).

Gostaria de agendar um novo horário?
Responda esta mensagem ou acesse nosso site para agendar.

Até breve!`;

      // Send WhatsApp message
      return await this.whatsAppService.sendMessage({
        businessId,
        phoneNumber: normalizePhoneNumber(appointment.clients.phone),
        message,
      });
    } catch (error) {
      console.error("Error sending follow-up message:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getNotificationPreferences(
    businessId: string
  ): Promise<NotificationPreferences | null> {
    try {
      const supabase = await createClient();
      const { data } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("business_id", businessId)
        .single();

      if (!data) {
        // Return default preferences if none found
        return {
          appointment_confirmation: true,
          appointment_reminder: false,
          follow_up_message: false,
          appointment_update: true,
          appointment_cancellation: true,
        };
      }

      return data as NotificationPreferences;
    } catch (error) {
      console.error("Error getting notification preferences:", error);
      return null;
    }
  }

  async updateNotificationPreferences(
    businessId: string,
    preferences: NotificationPreferences
  ): Promise<{ success: boolean; error: string | null }> {
    try {
      const supabase = await createClient();

      // Check if preferences already exist
      const { data: existing } = await supabase
        .from("notification_preferences")
        .select("id")
        .eq("business_id", businessId)
        .single();

      if (existing) {
        // Update existing preferences
        await supabase
          .from("notification_preferences")
          .update(preferences)
          .eq("business_id", businessId);
      } else {
        // Insert new preferences
        await supabase.from("notification_preferences").insert([
          {
            business_id: businessId,
            ...preferences,
          },
        ]);
      }

      return { success: true, error: null };
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}
