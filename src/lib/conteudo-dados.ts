import "server-only";
import { cache } from "react";
import type { Atalho } from "@/lib/conteudo";
import { createClient } from "@/lib/supabase/server";

// Atalhos ativos do cabeçalho ("mais buscados"), uma vez por requisição.
export const carregarAtalhos = cache(async (orgaoId: string): Promise<Atalho[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("atalhos")
    .select("id, rotulo, url, ordem, ativo")
    .eq("orgao_id", orgaoId)
    .eq("ativo", true)
    .order("ordem")
    .order("rotulo")
    .limit(6);
  return (data ?? []) as Atalho[];
});
