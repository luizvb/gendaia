import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NotificationService } from "@/lib/services/notification-service";
import { addHours, subDays } from "date-fns";

// This route will be called by a cron job to send scheduled notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const notificationService = new NotificationService();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const businessId = searchParams.get("business_id");

    if (!businessId) {
      return NextResponse.json(
        { error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Check notification preferences
    const preferences = await notificationService.getNotificationPreferences(
      businessId
    );
    if (!preferences) {
      return NextResponse.json(
        { error: "Failed to get notification preferences" },
        { status: 500 }
      );
    }

    // Handle different notification types
    switch (type) {
      case "appointment_reminder":
        if (!preferences.appointment_reminder) {
          return NextResponse.json({
            message: "Appointment reminders are disabled",
          });
        }

        // Find appointments starting in one hour
        const oneHourFromNow = addHours(new Date(), 1);
        const { data: upcomingAppointments } = await supabase
          .from("appointments")
          .select("id, business_id")
          .eq("business_id", businessId)
          .eq("status", "scheduled")
          .gte("start_time", new Date().toISOString())
          .lt("start_time", oneHourFromNow.toISOString());

        if (!upcomingAppointments || upcomingAppointments.length === 0) {
          return NextResponse.json({
            message: "No upcoming appointments to remind",
          });
        }

        // Send reminders
        const reminderResults = await Promise.all(
          upcomingAppointments.map(async (appointment) => {
            const result = await notificationService.sendAppointmentReminder(
              businessId,
              appointment.id
            );
            return {
              appointmentId: appointment.id,
              success: result.success,
              error: result.error,
            };
          })
        );

        return NextResponse.json({
          message: `Processed ${reminderResults.length} appointment reminders`,
          results: reminderResults,
        });

      case "follow_up":
        if (!preferences.follow_up_message) {
          return NextResponse.json({
            message: "Follow-up messages are disabled",
          });
        }

        // Find appointments from 15 days ago
        const fifteenDaysAgo = subDays(new Date(), 15);
        const { data: pastAppointments } = await supabase
          .from("appointments")
          .select("id, business_id")
          .eq("business_id", businessId)
          .eq("status", "completed")
          .gte("start_time", fifteenDaysAgo.toISOString())
          .lt("start_time", subDays(fifteenDaysAgo, 1).toISOString());

        if (!pastAppointments || pastAppointments.length === 0) {
          return NextResponse.json({ message: "No appointments to follow up" });
        }

        // Send follow-ups
        const followUpResults = await Promise.all(
          pastAppointments.map(async (appointment) => {
            const result = await notificationService.sendFollowUpMessage(
              businessId,
              appointment.id
            );
            return {
              appointmentId: appointment.id,
              success: result.success,
              error: result.error,
            };
          })
        );

        return NextResponse.json({
          message: `Processed ${followUpResults.length} follow-up messages`,
          results: followUpResults,
        });

      default:
        return NextResponse.json(
          { error: "Invalid notification type" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
