import "server-only";
import { cache } from "react";
import type { Etapa, FaseSessao, Fluxo, Setor, TipoDocumento } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";

export type ConfiguracaoProtocolo = {
  setores: Setor[];
  fluxos: Fluxo[];
  etapas: Etapa[];
  tipos: TipoDocumento[];
  fases: FaseSessao[];
};

// Toda a configuração do protocolo de um órgão, uma vez por requisição.
export const carregarConfiguracao = cache(async (orgaoId: string): Promise<ConfiguracaoProtocolo> => {
  const supabase = await createClient();
  const [setores, fluxos, etapas, tipos, fases] = await Promise.all([
    supabase.from("setores").select("id, nome, sigla, ativo").eq("orgao_id", orgaoId).order("nome"),
    supabase.from("fluxos").select("id, nome, descricao").eq("orgao_id", orgaoId).order("nome"),
    supabase.from("etapas").select("id, fluxo_id, nome, ordem, natureza, setor_id").eq("orgao_id", orgaoId).order("ordem"),
    supabase.from("tipos_documento").select("id, nome, sigla, categoria, fluxo_id, publico, ativo").eq("orgao_id", orgaoId).order("nome"),
    supabase.from("fases_sessao").select("id, nome, ordem, ativo").eq("orgao_id", orgaoId).order("ordem"),
  ]);
  return {
    setores: (setores.data ?? []) as Setor[],
    fluxos: (fluxos.data ?? []) as Fluxo[],
    etapas: (etapas.data ?? []) as Etapa[],
    tipos: (tipos.data ?? []) as TipoDocumento[],
    fases: (fases.data ?? []) as FaseSessao[],
  };
});
