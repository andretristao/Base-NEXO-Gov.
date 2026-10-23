"use server";

import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/Formulario";
import { urlImagem } from "@/lib/conteudo";
import { caminhoDaUrl, enviarImagem, removerImagem } from "@/lib/conteudo-imagens";
import { contrasteComBranco } from "@/lib/contraste";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

const CAMPOS = [
  "nome", "nome_curto", "endereco", "telefone", "email_contato",
  "encarregado_nome", "encarregado_email", "brasao_url", "cor_primaria",
] as const;

export async function salvarOrgao(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = String(dados.get("orgao") ?? "");
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);

  const alteracoes: Record<string, string | null> = {};
  for (const campo of CAMPOS) {
    const valor = String(dados.get(campo) ?? "").trim();
    alteracoes[campo] = valor === "" ? null : valor;
  }
  if (!alteracoes.nome) return { erro: "O nome do órgão é obrigatório." };
  if (!alteracoes.cor_primaria) delete alteracoes.cor_primaria;
  else if (!/^#[0-9a-f]{6}$/i.test(alteracoes.cor_primaria) || contrasteComBranco(alteracoes.cor_primaria) < 4.5) {
    return { erro: "A cor principal precisa ter contraste mínimo de 4,5:1 com texto branco (WCAG AA). Escolha um tom mais escuro." };
  }
  for (const email of ["email_contato", "encarregado_email"]) {
    if (alteracoes[email]) alteracoes[email] = alteracoes[email]!.toLowerCase();
  }

  const supabase = await createClient();
  // Brasão enviado pelo painel vai para o bucket de imagens do conteúdo.
  const arquivo = dados.get("brasao_arquivo");
  let novoBrasao: string | null = null;
  if (arquivo instanceof File && arquivo.size > 0) {
    const envio = await enviarImagem(supabase, orgao.id, arquivo, "brasao-");
    if ("erro" in envio) return { erro: envio.erro };
    novoBrasao = envio.caminho;
    alteracoes.brasao_url = urlImagem(novoBrasao);
  }

  const { error } = await supabase.from("orgaos").update(alteracoes).eq("id", orgao.id);
  if (error) {
    await removerImagem(supabase, novoBrasao);
    return { erro: error.message };
  }
  if (orgao.brasao_url !== alteracoes.brasao_url) await removerImagem(supabase, caminhoDaUrl(orgao.brasao_url));

  revalidatePath(`/${slug}`, "layout");
  return { ok: "Dados salvos." };
}
