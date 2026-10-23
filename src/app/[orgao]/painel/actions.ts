"use server";

import { exigirAcessoOrgao } from "@/lib/dal";
import { identificacao, situacaoDocumento } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";

export type ResultadoBusca = { id: string; titulo: string; assunto: string; situacao: string };

// "PL 12/2026", "pl nº 12/2026", "OF 3/2026"
const IDENTIFICACAO = /^([a-zA-ZçÇ]+)\s*(?:n[º°o.]?\s*)?(\d+)\s*\/\s*(\d{4})$/;

// Busca rápida da área restrita (Ctrl+K): documentos por protocolo, identificação, assunto ou interessado.
export async function buscarNoPainel(slug: string, termo: string): Promise<ResultadoBusca[]> {
  const { orgao } = await exigirAcessoOrgao(slug);
  const filtro = termo.replace(/[,()%]/g, " ").trim();
  if (filtro.length < 2) return [];

  const config = await carregarConfiguracao(orgao.id);
  const tipos = new Map(config.tipos.map((t) => [t.id, t]));

  const supabase = await createClient();
  let consulta = supabase
    .from("documentos")
    .select("id, protocolo, numero, ano, assunto, tipo_id, publicado_em, arquivado_em")
    .eq("orgao_id", orgao.id);

  const partes = filtro.match(IDENTIFICACAO);
  const tiposDaSigla = partes
    ? config.tipos.filter((t) => t.sigla.toLowerCase() === partes[1].toLowerCase()).map((t) => t.id)
    : [];
  if (partes && tiposDaSigla.length) {
    consulta = consulta.in("tipo_id", tiposDaSigla).eq("numero", Number(partes[2])).eq("ano", Number(partes[3]));
  } else {
    consulta = consulta.or(`assunto.ilike.%${filtro}%,protocolo.ilike.%${filtro}%,interessado.ilike.%${filtro}%`);
  }

  const { data } = await consulta.order("criado_em", { ascending: false }).limit(8);
  return (data ?? []).map((d) => {
    const t = tipos.get(d.tipo_id);
    return {
      id: d.id,
      titulo: `${t ? identificacao(t.sigla, d.numero, d.ano) : "Documento"} · ${d.protocolo}`,
      assunto: d.assunto,
      situacao: situacaoDocumento(d),
    };
  });
}
