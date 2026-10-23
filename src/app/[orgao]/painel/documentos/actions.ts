"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { mensagemErro } from "@/lib/erros";
import { createClient } from "@/lib/supabase/server";

const EDITORES = ["administrador", "gestor", "editor"] as const;
const LIMITE_ANEXO = 4 * 1024 * 1024;

function texto(dados: FormData, campo: string) {
  return String(dados.get(campo) ?? "").trim();
}

export async function criarDocumento(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const tipo = texto(dados, "tipo_id");
  const assunto = texto(dados, "assunto");
  if (!tipo || !assunto) return { erro: "Escolha o tipo e informe o assunto." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos")
    .insert({
      orgao_id: orgao.id,
      tipo_id: tipo,
      assunto,
      interessado: texto(dados, "interessado") || null,
      texto: texto(dados, "texto") || null,
    })
    .select("id")
    .single();
  if (error) return { erro: mensagemErro(error) };

  revalidatePath(`/${slug}/painel/documentos`);
  redirect(`/${slug}/painel/documentos/${data.id}`);
}

export async function salvarDocumento(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const id = texto(dados, "id");
  const assunto = texto(dados, "assunto");
  if (!assunto) return { erro: "O assunto é obrigatório." };

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("documentos")
    .update(
      { assunto, interessado: texto(dados, "interessado") || null, texto: texto(dados, "texto") || null },
      { count: "exact" },
    )
    .eq("id", id)
    .eq("orgao_id", orgao.id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Nada foi salvo. Confira se a sessão está validada com 2FA." };

  revalidatePath(`/${slug}/painel/documentos/${id}`);
  return { ok: "Documento salvo." };
}

export async function tramitarDocumento(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  await exigirAcessoOrgao(slug, [...EDITORES]);
  const id = texto(dados, "id");
  const etapa = texto(dados, "etapa_id");
  if (!etapa) return { erro: "Escolha a etapa de destino." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("tramitar_documento", {
    p_documento: id,
    p_etapa: etapa,
    p_setor: texto(dados, "setor_id") || null,
    p_despacho: texto(dados, "despacho") || null,
  });
  if (error) return { erro: mensagemErro(error) };

  revalidatePath(`/${slug}`, "layout");
  return { ok: "Documento tramitado." };
}

export async function enviarAnexo(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const id = texto(dados, "id");
  const arquivo = dados.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha um arquivo." };
  if (arquivo.size > LIMITE_ANEXO) return { erro: "O arquivo passa de 4 MB." };

  const nomeSeguro = arquivo.name
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .slice(-80);
  const caminho = `${orgao.id}/${id}/${Date.now()}-${nomeSeguro}`;

  const supabase = await createClient();
  const envio = await supabase.storage.from("protocolo").upload(caminho, arquivo, {
    contentType: arquivo.type || "application/octet-stream",
  });
  if (envio.error) return { erro: `Não foi possível enviar: ${envio.error.message}` };

  const { error } = await supabase.from("anexos").insert({
    orgao_id: orgao.id,
    documento_id: id,
    nome_arquivo: arquivo.name,
    caminho,
    tipo_mime: arquivo.type || null,
    tamanho: arquivo.size,
  });
  if (error) {
    await supabase.storage.from("protocolo").remove([caminho]);
    return { erro: mensagemErro(error) };
  }

  revalidatePath(`/${slug}/painel/documentos/${id}`);
  return { ok: `${arquivo.name} anexado.` };
}

export async function removerAnexo(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const anexo = texto(dados, "anexo");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("anexos")
    .delete()
    .eq("id", anexo)
    .eq("orgao_id", orgao.id)
    .select("caminho, documento_id");
  if (error) return { erro: mensagemErro(error) };
  if (!data?.length) return { erro: "Não foi possível remover. Documentos concluídos não mudam de anexos." };

  await supabase.storage.from("protocolo").remove([data[0].caminho]);
  revalidatePath(`/${slug}/painel/documentos/${data[0].documento_id}`);
  return { ok: "Anexo removido." };
}

export async function excluirDocumento(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const id = texto(dados, "id");

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("documentos")
    .select("publicado_em, anexos(caminho)")
    .eq("id", id)
    .eq("orgao_id", orgao.id)
    .maybeSingle();
  if (!doc) return { erro: "Documento não encontrado." };
  if (doc.publicado_em) return { erro: "Documento publicado não pode ser excluído; arquive-o." };

  // Arquivos primeiro: a política do Storage exige o documento ainda existente.
  const caminhos = (doc.anexos as { caminho: string }[]).map((a) => a.caminho);
  if (caminhos.length) await supabase.storage.from("protocolo").remove(caminhos);

  const { error, count } = await supabase
    .from("documentos")
    .delete({ count: "exact" })
    .eq("id", id)
    .eq("orgao_id", orgao.id);
  if (error) return { erro: mensagemErro(error) };
  if (!count) return { erro: "Nada foi excluído. Confira se a sessão está validada com 2FA." };

  revalidatePath(`/${slug}/painel/documentos`);
  redirect(`/${slug}/painel/documentos`);
}
