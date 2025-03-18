import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";

// Handler GET sem cache
export const GET = async (request: NextRequest) => {
  try {
    const supabase = await createClient();

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");
    const name = searchParams.get("name");

    // Get the business_id using our utility function
    const businessId = await getBusinessId(request);
    if (!businessId) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Base query
    let query = supabase
      .from("clients")
      .select(
        `
        *,
        lastVisit:appointments(created_at)
      `
      )
      .eq("business_id", businessId);

    // Apply filters if provided
    if (phone) {
      // Use ilike for partial phone number matches
      query = query.ilike("phone", `%${phone}%`);
    }

    if (name) {
      // Use ilike for partial name matches
      query = query.ilike("name", `%${name}%`);
    }

    // Execute query
    const { data: rawData, error } = await query.order("name");

    if (error) {
      console.error("Error fetching clients:", error);
      return NextResponse.json(
        { error: "Failed to fetch clients" },
        { status: 500 }
      );
    }

    // Transform the data to match the interface
    const data = rawData.map((client) => ({
      id: client.id,
      name: client.name,
      phone: client.phone,
      lastVisit: client.lastVisit?.[0]?.created_at || null,
      lastMessage: null,
    }));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in clients API:", error);
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
    if (!body.name || !body.phone) {
      return NextResponse.json(
        { error: "Name and phone are required" },
        { status: 400 }
      );
    }

    // Check if client with this phone already exists
    const { data: existingClient } = await supabase
      .from("clients")
      .select("id")
      .eq("phone", body.phone)
      .eq("business_id", businessId)
      .maybeSingle();

    if (existingClient) {
      return NextResponse.json(
        { error: "A client with this phone number already exists" },
        { status: 409 }
      );
    }

    // Create client
    const { data, error } = await supabase
      .from("clients")
      .insert([
        {
          name: body.name,
          phone: body.phone,
          email: body.email || null,
          business_id: businessId,
        },
      ])
      .select();

    if (error) {
      console.error("Error creating client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error in clients API:", error);
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
      return NextResponse.json({ error: "Missing client ID" }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};

    // Only include fields that are provided
    if (body.name) updateData.name = body.name;
    if (body.phone) updateData.phone = body.phone;
    if (body.email !== undefined) updateData.email = body.email;

    // If phone is being updated, check if it already exists
    if (body.phone) {
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("phone", body.phone)
        .eq("business_id", businessId)
        .neq("id", body.id)
        .maybeSingle();

      if (existingClient) {
        return NextResponse.json(
          { error: "A client with this phone number already exists" },
          { status: 409 }
        );
      }
    }

    // Update client
    const { error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", body.id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error updating client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating client:", error);
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

    // Get client ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Missing client ID" }, { status: 400 });
    }

    // Check if client has appointments
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("client_id", id)
      .eq("business_id", businessId);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Cannot delete client with existing appointments" },
        { status: 409 }
      );
    }

    // Delete client
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error deleting client:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
