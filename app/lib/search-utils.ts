import { SupabaseClient } from "@supabase/supabase-js";

// Função auxiliar para buscar profissional por similaridade de nome
export async function findProfessionalByName(
  supabase: SupabaseClient,
  name: string,
  businessId: string
) {
  // Primeiro tenta busca exata
  const { data: exactMatch } = await supabase
    .from("professionals")
    .select("id, name")
    .eq("name", name)
    .eq("business_id", businessId)
    .single();

  if (exactMatch) {
    return exactMatch;
  }

  // Se não encontrar, busca por similaridade usando ILIKE
  const { data: similarMatches } = await supabase
    .from("professionals")
    .select("id, name")
    .ilike("name", `%${name}%`)
    .eq("business_id", businessId)
    .order("name");

  if (similarMatches && similarMatches.length > 0) {
    // Retorna o primeiro resultado mais similar
    return similarMatches[0];
  }

  return null;
}

// Função auxiliar para buscar serviço por similaridade de nome
export async function findServiceByName(
  supabase: SupabaseClient,
  name: string,
  businessId: string
) {
  // Primeiro tenta busca exata
  const { data: exactMatch } = await supabase
    .from("services")
    .select("id, name, duration")
    .eq("name", name)
    .eq("business_id", businessId)
    .single();

  if (exactMatch) {
    return {
      found: true,
      service: exactMatch,
      suggestions: null,
    };
  }

  // Se não encontrar, busca por similaridade usando ILIKE
  const { data: similarMatches } = await supabase
    .from("services")
    .select("id, name, duration")
    .ilike("name", `%${name}%`)
    .eq("business_id", businessId)
    .order("name");

  if (similarMatches && similarMatches.length > 0) {
    // Retorna o primeiro resultado mais similar
    return {
      found: true,
      service: similarMatches[0],
      suggestions: similarMatches.slice(0, 5), // Retorna até 5 sugestões
    };
  }

  // Se não encontrar nada similar, busca todos os serviços como sugestões
  const { data: allServices } = await supabase
    .from("services")
    .select("id, name, duration")
    .eq("business_id", businessId)
    .order("name")
    .limit(5);

  return {
    found: false,
    service: null,
    suggestions: allServices || [],
  };
}
