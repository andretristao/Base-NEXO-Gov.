"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { mensagemErro } from "@/lib/erros";
import { minutaAta, montarDataHora, rotuloResultado, rotuloSituacaoSessao, rotuloTipoSessao, type ItemAta } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";

const EDITORES = ["administrador", "gestor", "editor"] as const;

function texto(dados: FormData, campo: string) {
  return String(dados.get(campo) ?? "").trim();
}

function revalidar(slug: string) {
  revalidatePath(`/${slug}/painel/sessoes`, "layout");
  revalidatePath(`/${slug}/sessoes`, "layout");
}

export async function criarSessao(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const tipo = texto(dados, "tipo");
  const dataHora = montarDataHora(texto(dados, "data"), texto(dados, "hora"));
  if (!(tipo in rotuloTipoSessao) || !dataHora) return { erro: "Informe tipo, data e horário." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessoes")
    .insert({ orgao_id: orgao.id, tipo, data_hora: dataHora, local: texto(dados, "local") || null })
    .select("id")
    .single();
  if (error) return { erro: mensagemErro(error) };

  revalidar(slug);
  redirect(`/${slug}/painel/sessoes/${data.id}`);
}

export async function salvarSessao(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const id = texto(dados, "id");
  const situacao = texto(dados, "situacao");
  const dataHora = montarDataHora(texto(dados, "data"), texto(dados, "hora"));
  if (!(situacao in rotuloSituacaoSessao) || !dataHora) return { erro: "Informe data, horário e situação." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("sessoes")
    .update({
      data_hora: dataHora,
      local: texto(dados, "local") || null,
      situacao,
      observacoes: texto(dados, "observacoes") || null,
    }, { count: "exact" })
    .eq("id", id)
    .eq("orgao_id", orgao.id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Nada foi salvo. Confira se a sessão está validada com 2FA." };

  revalidar(slug);
  return { ok: "Sessão salva." };
}

export async function excluirSessao(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("sessoes")
    .delete({ count: "exact" })
    .eq("id", texto(dados, "id"))
    .eq("orgao_id", orgao.id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Nada foi excluído. Confira se a sessão está validada com 2FA." };

  revalidar(slug);
  redirect(`/${slug}/painel/sessoes`);
}

export async function incluirItemPauta(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const sessao = texto(dados, "id");
  const fase = texto(dados, "fase_id");
  const documento = texto(dados, "documento_id") || null;
  let descricao = texto(dados, "descricao");
  const supabase = await createClient();

  // Sem descrição, usa a identificação e o assunto do documento escolhido.
  if (!descricao && documento) {
    const { data } = await supabase
      .from("documentos")
      .select("numero, ano, assunto, interessado, tipos_documento(sigla, nome)")
      .eq("id", documento)
      .maybeSingle();
    if (data) {
      const tipo = data.tipos_documento as unknown as { sigla: string; nome: string };
      descricao = `${tipo.nome} nº ${data.numero}/${data.ano}${data.interessado ? `, de ${data.interessado}` : ""}: ${data.assunto}`;
    }
  }
  if (!fase || !descricao) return { erro: "Escolha a fase e informe a descrição ou um documento." };

  const { count: total } = await supabase
    .from("pauta_itens")
    .select("*", { count: "exact", head: true })
    .eq("sessao_id", sessao)
    .eq("fase_id", fase);
  const { error } = await supabase.from("pauta_itens").insert({
    orgao_id: orgao.id,
    sessao_id: sessao,
    fase_id: fase,
    documento_id: documento,
    descricao,
    ordem: (total ?? 0) + 1,
  });
  if (error) return { erro: mensagemErro(error) };

  revalidar(slug);
  return { ok: "Item incluído na pauta." };
}

export async function salvarItemPauta(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const resultado = texto(dados, "resultado");
  if (resultado && !(resultado in rotuloResultado)) return { erro: "Resultado inválido." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("pauta_itens")
    .update({
      descricao: texto(dados, "descricao"),
      ordem: Number(texto(dados, "ordem")) || 0,
      resultado: resultado || null,
    }, { count: "exact" })
    .eq("id", texto(dados, "item"))
    .eq("orgao_id", orgao.id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Nada foi salvo. Confira se a sessão está validada com 2FA." };

  revalidar(slug);
  return { ok: "Item salvo." };
}

export async function removerItemPauta(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("pauta_itens")
    .delete({ count: "exact" })
    .eq("id", texto(dados, "item"))
    .eq("orgao_id", orgao.id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Nada foi removido. Confira se a sessão está validada com 2FA." };

  revalidar(slug);
  return { ok: "Item removido." };
}

// Cria a ata como documento do tipo "ata", com a minuta montada a partir da pauta,
// e a vincula à sessão. A ata segue o fluxo configurado (Criada → … → Publicada).
export async function gerarAta(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const id = texto(dados, "id");
  const supabase = await createClient();

  const [{ data: sessao }, { data: itens }, { data: tipoAta }] = await Promise.all([
    supabase.from("sessoes").select("*").eq("id", id).eq("orgao_id", orgao.id).maybeSingle(),
    supabase.from("pauta_itens").select("descricao, resultado, ordem, fases_sessao(nome, ordem)").eq("sessao_id", id),
    supabase.from("tipos_documento").select("id").eq("orgao_id", orgao.id).eq("categoria", "ata").eq("ativo", true)
      .order("criado_em").limit(1).maybeSingle(),
  ]);
  if (!sessao) return { erro: "Sessão não encontrada." };
  if (sessao.ata_documento_id) return { erro: "Esta sessão já tem ata." };
  if (!tipoAta) return { erro: "Cadastre um tipo de documento da categoria Ata na configuração do protocolo." };

  const ordenados: ItemAta[] = (itens ?? [])
    .map((i) => ({ ...i, fase: i.fases_sessao as unknown as { nome: string; ordem: number } }))
    .sort((a, b) => a.fase.ordem - b.fase.ordem || a.ordem - b.ordem)
    .map((i) => ({ fase: i.fase.nome, descricao: i.descricao, resultado: i.resultado }));
  const { titulo, texto: minuta } = minutaAta(orgao, sessao, ordenados);

  const { data: ata, error } = await supabase
    .from("documentos")
    .insert({ orgao_id: orgao.id, tipo_id: tipoAta.id, assunto: titulo, interessado: "Mesa Diretora", texto: minuta })
    .select("id")
    .single();
  if (error) return { erro: mensagemErro(error) };

  const vinculo = await supabase.from("sessoes").update({ ata_documento_id: ata.id }).eq("id", id);
  if (vinculo.error) return { erro: mensagemErro(vinculo.error) };

  revalidar(slug);
  redirect(`/${slug}/painel/documentos/${ata.id}`);
}
