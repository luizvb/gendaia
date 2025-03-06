import { NextRequest, NextResponse } from "next/server";
import { invalidateAllSimpleCache } from "@/lib/simple-cache";
import { revalidateTag } from "next/cache";
import { CacheTags } from "@/lib/cache-utils";

/**
 * Rota para limpar todo o cache
 * Útil para solucionar problemas
 */
export async function GET(request: NextRequest) {
  try {
    // Limpar cache simples
    invalidateAllSimpleCache();

    // Tentar limpar cache do Next.js
    try {
      // Invalidar todas as tags conhecidas
      Object.values(CacheTags).forEach((tag) => {
        revalidateTag(tag);
      });
    } catch (error) {
      console.error("Error invalidating Next.js cache:", error);
    }

    return NextResponse.json({
      success: true,
      message: "Cache limpo com sucesso",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    return NextResponse.json(
      {
        error: "Erro ao limpar cache",
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// Adicionar esta configuração para evitar que o middleware exija autenticação
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
