import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";

// Handler original para GET
async function getServicesHandler(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const publicBusinessId = searchParams.get("business_id");

    // If business_id is provided in query params, use it (public access)
    // Otherwise, get from session (authenticated access)
    let businessId;

    if (publicBusinessId) {
      businessId = publicBusinessId;
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get the business_id using our utility function
      businessId = await getBusinessId(request);
      if (!businessId) {
        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 }
        );
      }
    }

    // Execute query
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .order("name");

    if (error) {
      console.error("Error fetching services:", error);
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in services API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Handler GET sem cache
export const GET = async (request: NextRequest) => {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const publicBusinessId = searchParams.get("business_id");

    // If business_id is provided in query params, use it (public access)
    // Otherwise, get from session (authenticated access)
    let businessId;

    if (publicBusinessId) {
      businessId = publicBusinessId;
    } else {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      // Get the business_id using our utility function
      businessId = await getBusinessId(request);
      if (!businessId) {
        return NextResponse.json(
          { error: "Business not found" },
          { status: 404 }
        );
      }
    }

    // Execute query
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("business_id", businessId)
      .order("name");

    if (error) {
      console.error("Error fetching services:", error);
      return NextResponse.json(
        { error: "Failed to fetch services" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in services API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
};

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

    // Validate required fields
    if (!body.name || !body.duration || body.price === undefined) {
      return NextResponse.json(
        { error: "Name, duration, and price are required" },
        { status: 400 }
      );
    }

    // Create service
    const { data, error } = await supabase
      .from("services")
      .insert([
        {
          name: body.name,
          description: body.description || null,
          duration: body.duration,
          price: body.price,
          business_id: businessId,
        },
      ])
      .select();

    if (error) {
      console.error("Error creating service:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error in services API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    if (!body.id) {
      return NextResponse.json(
        { error: "Missing service ID" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Only include fields that are provided
    if (body.name) updateData.name = body.name;
    if (body.description !== undefined)
      updateData.description = body.description;
    if (body.duration) updateData.duration = body.duration;
    if (body.price !== undefined) updateData.price = body.price;

    // Update service
    const { error } = await supabase
      .from("services")
      .update(updateData)
      .eq("id", body.id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error updating service:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    // Get service ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing service ID" },
        { status: 400 }
      );
    }

    // Check if service has appointments
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("service_id", id)
      .eq("business_id", businessId);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Cannot delete service with existing appointments" },
        { status: 409 }
      );
    }

    // Delete service
    const { error } = await supabase
      .from("services")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error deleting service:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting service:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
