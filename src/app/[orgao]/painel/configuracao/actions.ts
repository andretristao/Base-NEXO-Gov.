"use server";

import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { mensagemErro } from "@/lib/erros";
import { createClient } from "@/lib/supabase/server";

type TipoCampo = "texto" | "opcional" | "numero" | "booleano";

// Tabelas de configuração editáveis pelo administrador e os campos aceitos de cada uma.
const TABELAS: Record<string, Record<string, TipoCampo>> = {
  setores: { nome: "texto", sigla: "texto", ativo: "booleano" },
  fluxos: { nome: "texto", descricao: "opcional" },
  etapas: { fluxo_id: "texto", nome: "texto", ordem: "numero", natureza: "texto", setor_id: "opcional" },
  tipos_documento: {
    nome: "texto", sigla: "texto", categoria: "texto", fluxo_id: "texto", publico: "booleano", ativo: "booleano",
  },
  fases_sessao: { nome: "texto", ordem: "numero", ativo: "booleano" },
};

function lerCampos(tabela: string, dados: FormData) {
  const valores: Record<string, string | number | boolean | null> = {};
  for (const [campo, tipo] of Object.entries(TABELAS[tabela])) {
    const bruto = String(dados.get(campo) ?? "").trim();
    if (tipo === "booleano") valores[campo] = dados.get(campo) === "on";
    else if (tipo === "numero") valores[campo] = Number(bruto) || 0;
    else if (tipo === "opcional") valores[campo] = bruto || null;
    else valores[campo] = campo === "sigla" ? bruto.toUpperCase() : bruto;
  }
  return valores;
}

async function contexto(dados: FormData) {
  const slug = String(dados.get("orgao") ?? "");
  const tabela = String(dados.get("tabela") ?? "");
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  if (!(tabela in TABELAS)) throw new Error("tabela inválida");
  return { slug, tabela, orgao, id: String(dados.get("id") ?? "") };
}

export async function salvarConfiguracao(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const { slug, tabela, orgao, id } = await contexto(dados);
  const valores = lerCampos(tabela, dados);
  const supabase = await createClient();

  const { error, count } = id
    ? await supabase.from(tabela).update(valores, { count: "exact" }).eq("id", id).eq("orgao_id", orgao.id)
    : await supabase.from(tabela).insert({ ...valores, orgao_id: orgao.id }, { count: "exact" });
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Nada foi salvo. Confira se a sessão está validada com 2FA." };

  revalidatePath(`/${slug}/painel/configuracao`, "layout");
  return { ok: id ? "Alterações salvas." : "Incluído." };
}

export async function excluirConfiguracao(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const { slug, tabela, orgao, id } = await contexto(dados);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from(tabela)
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("orgao_id", orgao.id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Nada foi excluído. Confira se a sessão está validada com 2FA." };

  revalidatePath(`/${slug}/painel/configuracao`, "layout");
  return { ok: "Excluído." };
}

export async function carregarModeloPadrao(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = String(dados.get("orgao") ?? "");
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const supabase = await createClient();
  const { error } = await supabase.rpc("configurar_protocolo_padrao", { p_orgao: orgao.id });
  if (error) return { erro: mensagemErro(error) };

  revalidatePath(`/${slug}/painel`, "layout");
  return { ok: "Modelo carregado. Ajuste setores, fluxos e tipos como quiser." };
}
