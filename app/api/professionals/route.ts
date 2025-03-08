import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBusinessId } from "@/lib/business-id";
import { invalidateCacheTags, CacheTags } from "@/lib/cache-utils";
import {
  createSimpleCachedHandler,
  invalidateSimpleCache,
} from "@/lib/simple-cache";

// Handler original para GET
async function getProfessionalsHandler(request: NextRequest) {
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

    // Execute query
    const { data, error } = await supabase
      .from("professionals")
      .select("*")
      .eq("business_id", businessId)
      .order("name");

    if (error) {
      console.error("Error fetching professionals:", error);
      return NextResponse.json(
        { error: "Failed to fetch professionals" },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in professionals API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Aplicando cache simples ao handler GET com tempo mais longo (30 minutos)
export const GET = createSimpleCachedHandler(getProfessionalsHandler, {
  // Cache por 30 minutos
  ttl: 1800,
  // Função personalizada para gerar a chave de cache
  getCacheKey: (request) => {
    try {
      const businessId = request.headers.get("x-business-id") || "";

      // Criar uma chave de cache baseada no ID do negócio
      return `professionals-${businessId}`;
    } catch (error) {
      console.error("Error creating cache key:", error);
      return "professionals-default";
    }
  },
});

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
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create professional
    const { data, error } = await supabase
      .from("professionals")
      .insert([
        {
          name: body.name,
          color: body.color || null,
          business_id: businessId,
        },
      ])
      .select();

    if (error) {
      console.error("Error creating professional:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidate cache
    try {
      invalidateCacheTags([CacheTags.PROFESSIONALS]);

      // Invalidar cache simples
      const businessIdStr = businessId.toString();
      invalidateSimpleCache(`professionals-${businessIdStr}`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
      // Continuar mesmo se a invalidação falhar
    }

    return NextResponse.json(data[0], { status: 201 });
  } catch (error) {
    console.error("Error in professionals API:", error);
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
        { error: "Missing professional ID" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};

    // Only include fields that are provided
    if (body.name) updateData.name = body.name;
    if (body.color !== undefined) updateData.color = body.color;

    // Update professional
    const { error } = await supabase
      .from("professionals")
      .update(updateData)
      .eq("id", body.id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error updating professional:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidate cache
    try {
      invalidateCacheTags([CacheTags.PROFESSIONALS]);

      // Invalidar cache simples
      const businessIdStr = businessId.toString();
      invalidateSimpleCache(`professionals-${businessIdStr}`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
      // Continuar mesmo se a invalidação falhar
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating professional:", error);
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

    // Get professional ID from URL
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Missing professional ID" },
        { status: 400 }
      );
    }

    // Check if professional has appointments
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("professional_id", id)
      .eq("business_id", businessId);

    if (count && count > 0) {
      return NextResponse.json(
        { error: "Cannot delete professional with existing appointments" },
        { status: 409 }
      );
    }

    // Delete professional
    const { error } = await supabase
      .from("professionals")
      .delete()
      .eq("id", id)
      .eq("business_id", businessId);

    if (error) {
      console.error("Error deleting professional:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Invalidate cache
    try {
      invalidateCacheTags([CacheTags.PROFESSIONALS]);

      // Invalidar cache simples
      const businessIdStr = businessId.toString();
      invalidateSimpleCache(`professionals-${businessIdStr}`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-daily`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-weekly`);
      invalidateSimpleCache(`dashboard-${businessIdStr}-monthly`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
      // Continuar mesmo se a invalidação falhar
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting professional:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
