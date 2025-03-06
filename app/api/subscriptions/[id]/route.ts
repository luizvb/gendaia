import { NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const { data, error } = await supabase.from("subscriptions").select("*").eq("id", id).single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error("Erro ao buscar assinatura:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        plan: body.plan,
        status: body.status,
        start_date: body.start_date,
        end_date: body.end_date,
        trial_end_date: body.trial_end_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (data.length === 0) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 })
    }

    return NextResponse.json(data[0])
  } catch (error) {
    console.error("Erro ao atualizar assinatura:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    const { error } = await supabase.from("subscriptions").delete().eq("id", id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error("Erro ao excluir assinatura:", error)
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 })
  }
}

