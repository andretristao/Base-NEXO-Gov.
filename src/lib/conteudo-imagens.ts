import "server-only";
import { BUCKET_CONTEUDO, LIMITE_IMAGEM, TIPOS_IMAGEM, urlImagem } from "@/lib/conteudo";
import type { createClient } from "@/lib/supabase/server";

type Cliente = Awaited<ReturnType<typeof createClient>>;

// Envia a imagem para <orgao_id>/<aleatório>.<ext> no bucket público do conteúdo.
export async function enviarImagem(supabase: Cliente, orgaoId: string, arquivo: File, prefixo = "") {
  if (!TIPOS_IMAGEM.includes(arquivo.type)) return { erro: "Use uma imagem JPG, PNG ou WebP." };
  if (arquivo.size > LIMITE_IMAGEM) return { erro: "A imagem passa de 2 MB." };
  const extensao = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[arquivo.type];
  const caminho = `${orgaoId}/${prefixo}${crypto.randomUUID()}.${extensao}`;
  const { error } = await supabase.storage.from(BUCKET_CONTEUDO).upload(caminho, arquivo, { contentType: arquivo.type });
  if (error) return { erro: `Não foi possível enviar a imagem: ${error.message}` };
  return { caminho };
}

export async function removerImagem(supabase: Cliente, caminho: string | null | undefined) {
  if (caminho) await supabase.storage.from(BUCKET_CONTEUDO).remove([caminho]);
}

// Caminho no bucket a partir de uma URL pública gerada por urlImagem(); nulo se for de fora.
export function caminhoDaUrl(url: string | null) {
  const base = urlImagem("x")!.slice(0, -1);
  return url?.startsWith(base) ? decodeURIComponent(url.slice(base.length)) : null;
}
