// Tipos e utilidades do módulo Conteúdo (notícias, banners e atalhos do portal).
import { supabaseUrl } from "@/lib/env";

export type Noticia = {
  id: string;
  titulo: string;
  resumo: string | null;
  corpo: string | null;
  categoria: string | null;
  imagem_caminho: string | null;
  imagem_alt: string | null;
  destaque: boolean;
  publicada: boolean;
  publicado_em: string | null;
  criado_em: string;
  atualizado_em: string;
};

export type Banner = {
  id: string;
  titulo: string;
  texto: string | null;
  link_url: string | null;
  link_rotulo: string | null;
  imagem_caminho: string | null;
  imagem_alt: string | null;
  ordem: number;
  ativo: boolean;
  inicio_em: string | null;
  fim_em: string | null;
};

export type Atalho = { id: string; rotulo: string; url: string; ordem: number; ativo: boolean };

export const BUCKET_CONTEUDO = "conteudo";
export const LIMITE_IMAGEM = 2 * 1024 * 1024;
export const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];

export const CATEGORIAS_SUGERIDAS = [
  "Administração", "Assistência Social", "Cultura", "Educação", "Esporte", "Legislativo",
  "Meio Ambiente", "Obras", "Saúde", "Segurança", "Transparência",
];

// Bucket público: a imagem é servida direto pelo Storage.
export function urlImagem(caminho: string | null) {
  if (!caminho) return null;
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET_CONTEUDO}/${caminho.split("/").map(encodeURIComponent).join("/")}`;
}

// Parágrafos separados por linha em branco.
export function paragrafos(texto: string | null) {
  return (texto ?? "").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
}

// Situação para listas do painel.
export function situacaoNoticia(n: Pick<Noticia, "publicada" | "publicado_em">, agora = Date.now()) {
  if (!n.publicada) return "Rascunho";
  if (n.publicado_em && new Date(n.publicado_em).getTime() > agora) return "Agendada";
  return "Publicada";
}

export function situacaoBanner(b: Pick<Banner, "ativo" | "inicio_em" | "fim_em">, agora = Date.now()) {
  if (!b.ativo) return "Desativado";
  if (b.inicio_em && new Date(b.inicio_em).getTime() > agora) return "Agendado";
  if (b.fim_em && new Date(b.fim_em).getTime() <= agora) return "Encerrado";
  return "No ar";
}

// Links aceitos pelo banco: caminho do próprio portal ou https.
export function linkValido(url: string) {
  return /^(\/|https:\/\/)/.test(url);
}
