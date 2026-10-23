"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/Formulario";
import { linkValido } from "@/lib/conteudo";
import { enviarImagem, removerImagem } from "@/lib/conteudo-imagens";
import { exigirAcessoOrgao } from "@/lib/dal";
import { mensagemErro } from "@/lib/erros";
import { montarDataHora } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";

const EDITORES = ["administrador", "gestor", "editor"] as const;

type Cliente = Awaited<ReturnType<typeof createClient>>;

function texto(dados: FormData, campo: string) {
  return String(dados.get(campo) ?? "").trim();
}

function marcado(dados: FormData, campo: string) {
  return dados.get(campo) === "on";
}

function arquivoEnviado(dados: FormData, campo: string) {
  const arquivo = dados.get(campo);
  return arquivo instanceof File && arquivo.size > 0 ? arquivo : null;
}

// Troca, mantém ou remove a imagem de um registro. Devolve o novo caminho (ou erro).
async function resolverImagem(supabase: Cliente, orgaoId: string, dados: FormData, atual: string | null) {
  const arquivo = arquivoEnviado(dados, "imagem");
  if (arquivo) return enviarImagem(supabase, orgaoId, arquivo);
  if (marcado(dados, "remover_imagem")) return { caminho: null };
  return { caminho: atual };
}

// ---------------------------------------------------------------------------
// Notícias
// ---------------------------------------------------------------------------

export async function salvarNoticia(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const id = texto(dados, "id");
  const titulo = texto(dados, "titulo");
  if (!titulo) return { erro: "Informe o título." };

  const data = texto(dados, "data");
  const publicadoEm = data ? montarDataHora(data, texto(dados, "hora") || "08:00") : null;
  if (data && !publicadoEm) return { erro: "Data ou horário de publicação inválidos." };

  const supabase = await createClient();
  const atual = id
    ? (await supabase.from("noticias").select("imagem_caminho").eq("id", id).eq("orgao_id", orgao.id).maybeSingle()).data
    : null;
  if (id && !atual) return { erro: "Notícia não encontrada." };

  const imagemAlt = texto(dados, "imagem_alt");
  const imagem = await resolverImagem(supabase, orgao.id, dados, atual?.imagem_caminho ?? null);
  if ("erro" in imagem) return { erro: imagem.erro };
  if (imagem.caminho && !imagemAlt) {
    if (imagem.caminho !== atual?.imagem_caminho) await removerImagem(supabase, imagem.caminho);
    return { erro: "Descreva a imagem no campo “Texto alternativo” (acessibilidade)." };
  }

  const registro = {
    titulo,
    resumo: texto(dados, "resumo") || null,
    corpo: texto(dados, "corpo") || null,
    categoria: texto(dados, "categoria") || null,
    imagem_caminho: imagem.caminho,
    imagem_alt: imagem.caminho ? imagemAlt : null,
    destaque: marcado(dados, "destaque"),
    publicada: texto(dados, "situacao") === "publicada",
    publicado_em: publicadoEm,
  };

  const resposta = id
    ? await supabase.from("noticias").update(registro, { count: "exact" }).eq("id", id).eq("orgao_id", orgao.id).select("id").maybeSingle()
    : await supabase.from("noticias").insert({ ...registro, orgao_id: orgao.id }).select("id").single();
  if (resposta.error || !resposta.data) {
    if (imagem.caminho !== (atual?.imagem_caminho ?? null)) await removerImagem(supabase, imagem.caminho);
    return { erro: resposta.error ? mensagemErro(resposta.error) : "Nada foi salvo. Confira se a sessão está validada com 2FA." };
  }
  if (atual?.imagem_caminho && atual.imagem_caminho !== imagem.caminho) await removerImagem(supabase, atual.imagem_caminho);

  revalidatePath(`/${slug}`, "layout");
  if (!id) redirect(`/${slug}/painel/conteudo/noticias/${resposta.data.id}?salvo=1`);
  return { ok: registro.publicada ? "Notícia salva e publicada." : "Rascunho salvo." };
}

export async function excluirNoticia(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  if (!marcado(dados, "confirmar")) return { erro: "Marque a confirmação para excluir." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("noticias").delete().eq("id", texto(dados, "id")).eq("orgao_id", orgao.id)
    .select("imagem_caminho").maybeSingle();
  if (error) return { erro: mensagemErro(error) };
  if (!data) return { erro: "Nada foi excluído. Confira se a sessão está validada com 2FA." };
  await removerImagem(supabase, data.imagem_caminho);

  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/painel/conteudo/noticias`);
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------

export async function salvarBanner(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const id = texto(dados, "id");
  const titulo = texto(dados, "titulo");
  const link = texto(dados, "link_url");
  if (!titulo) return { erro: "Informe o título." };
  if (link && !linkValido(link)) return { erro: "O link deve começar com / (página do portal) ou https://." };

  const inicio = texto(dados, "inicio");
  const fim = texto(dados, "fim");
  const inicioEm = inicio ? montarDataHora(inicio, "00:00") : null;
  const fimEm = fim ? montarDataHora(fim, "23:59") : null;
  if ((inicio && !inicioEm) || (fim && !fimEm)) return { erro: "Datas de exibição inválidas." };
  if (inicioEm && fimEm && fimEm <= inicioEm) return { erro: "O fim da exibição deve ser depois do início." };

  const supabase = await createClient();
  const atual = id
    ? (await supabase.from("banners").select("imagem_caminho").eq("id", id).eq("orgao_id", orgao.id).maybeSingle()).data
    : null;
  if (id && !atual) return { erro: "Banner não encontrado." };

  const imagemAlt = texto(dados, "imagem_alt");
  const imagem = await resolverImagem(supabase, orgao.id, dados, atual?.imagem_caminho ?? null);
  if ("erro" in imagem) return { erro: imagem.erro };
  if (imagem.caminho && !imagemAlt) {
    if (imagem.caminho !== atual?.imagem_caminho) await removerImagem(supabase, imagem.caminho);
    return { erro: "Descreva a imagem no campo “Texto alternativo” (acessibilidade)." };
  }

  const registro = {
    titulo,
    texto: texto(dados, "texto") || null,
    link_url: link || null,
    link_rotulo: texto(dados, "link_rotulo") || null,
    imagem_caminho: imagem.caminho,
    imagem_alt: imagem.caminho ? imagemAlt : null,
    ordem: Number(texto(dados, "ordem")) || 0,
    ativo: marcado(dados, "ativo"),
    inicio_em: inicioEm,
    fim_em: fimEm,
  };

  const resposta = id
    ? await supabase.from("banners").update(registro).eq("id", id).eq("orgao_id", orgao.id).select("id").maybeSingle()
    : await supabase.from("banners").insert({ ...registro, orgao_id: orgao.id }).select("id").single();
  if (resposta.error || !resposta.data) {
    if (imagem.caminho !== (atual?.imagem_caminho ?? null)) await removerImagem(supabase, imagem.caminho);
    return { erro: resposta.error ? mensagemErro(resposta.error) : "Nada foi salvo. Confira se a sessão está validada com 2FA." };
  }
  if (atual?.imagem_caminho && atual.imagem_caminho !== imagem.caminho) await removerImagem(supabase, atual.imagem_caminho);

  revalidatePath(`/${slug}`, "layout");
  if (!id) redirect(`/${slug}/painel/conteudo/banners`);
  return { ok: "Banner salvo." };
}

export async function excluirBanner(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  if (!marcado(dados, "confirmar")) return { erro: "Marque a confirmação para excluir." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("banners").delete().eq("id", texto(dados, "id")).eq("orgao_id", orgao.id)
    .select("imagem_caminho").maybeSingle();
  if (error) return { erro: mensagemErro(error) };
  if (!data) return { erro: "Nada foi excluído. Confira se a sessão está validada com 2FA." };
  await removerImagem(supabase, data.imagem_caminho);

  revalidatePath(`/${slug}`, "layout");
  redirect(`/${slug}/painel/conteudo/banners`);
}

// ---------------------------------------------------------------------------
// Atalhos "mais buscados"
// ---------------------------------------------------------------------------

export async function salvarAtalho(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const id = texto(dados, "id");
  const rotulo = texto(dados, "rotulo");
  const url = texto(dados, "url");
  if (!rotulo || !url) return { erro: "Informe o texto e o link." };
  if (!linkValido(url)) return { erro: "O link deve começar com / (página do portal) ou https://." };

  const registro = { rotulo, url, ordem: Number(texto(dados, "ordem")) || 0, ativo: marcado(dados, "ativo") };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("atalhos").update(registro).eq("id", id).eq("orgao_id", orgao.id).select("id").maybeSingle()
    : await supabase.from("atalhos").insert({ ...registro, orgao_id: orgao.id }).select("id").single();
  if (error) return { erro: mensagemErro(error) };
  if (!data) return { erro: "Nada foi salvo. Confira se a sessão está validada com 2FA." };

  revalidatePath(`/${slug}`, "layout");
  return { ok: id ? "Atalho salvo." : `Atalho “${rotulo}” incluído.` };
}

export async function excluirAtalho(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = texto(dados, "orgao");
  const { orgao } = await exigirAcessoOrgao(slug, [...EDITORES]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("atalhos").delete().eq("id", texto(dados, "id")).eq("orgao_id", orgao.id)
    .select("id").maybeSingle();
  if (error) return { erro: mensagemErro(error) };
  if (!data) return { erro: "Nada foi excluído. Confira se a sessão está validada com 2FA." };

  revalidatePath(`/${slug}`, "layout");
  return { ok: "Atalho excluído." };
}
