import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { NotificationService } from "@/lib/services/notification-service";
import { getBusinessId } from "@/lib/business-id";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    const notificationService = new NotificationService();
    const preferences = await notificationService.getNotificationPreferences(
      businessId
    );

    if (!preferences) {
      return NextResponse.json(
        { error: "Failed to get notification preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json(preferences);
  } catch (error) {
    console.error("Error in notification preferences API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();

    const notificationService = new NotificationService();
    const result = await notificationService.updateNotificationPreferences(
      businessId,
      {
        appointment_confirmation: body.appointment_confirmation !== false,
        appointment_reminder: !!body.appointment_reminder,
        follow_up_message: !!body.follow_up_message,
        appointment_update: body.appointment_update !== false,
        appointment_cancellation: body.appointment_cancellation !== false,
      }
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update preferences" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in notification preferences API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
