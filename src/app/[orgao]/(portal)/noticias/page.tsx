import type { Metadata } from "next";
import Link from "next/link";
import { CartaoNoticia } from "@/components/CartaoNoticia";
import { exigirOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notícias" };

const POR_PAGINA = 12;
const COLUNAS = "id, titulo, resumo, categoria, imagem_caminho, imagem_alt, publicado_em";

export default async function NoticiasPublicas({ params, searchParams }: PageProps<"/[orgao]/noticias">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);
  const filtros = await searchParams;
  const categoria = typeof filtros.categoria === "string" ? filtros.categoria : "";
  const pagina = Math.max(1, Number(filtros.pagina) || 1);
  const base = `/${orgao.slug}`;
  const agora = new Date().toISOString();

  // RLS já esconde rascunhos do público; o filtro repete a regra para quem é da equipe.
  const supabase = await createClient();
  const publicadas = () => supabase.from("noticias").select(COLUNAS, { count: "exact" }).eq("orgao_id", orgao.id)
    .eq("publicada", true).lte("publicado_em", agora);
  let consulta = publicadas();
  if (categoria) consulta = consulta.eq("categoria", categoria);
  const [{ data, count }, { data: cats }] = await Promise.all([
    consulta.order("publicado_em", { ascending: false }).range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1),
    supabase.from("noticias").select("categoria").eq("orgao_id", orgao.id).eq("publicada", true)
      .lte("publicado_em", agora).not("categoria", "is", null).limit(1000),
  ]);
  const categorias = [...new Set((cats ?? []).map((c) => c.categoria as string))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));
  const link = (p: number) => `?${new URLSearchParams({ ...(categoria ? { categoria } : {}), pagina: String(p) })}`;

  return (
    <>
      <h1 className="text-2xl font-bold sm:text-3xl">Notícias</h1>
      <p className="mt-1 text-texto-suave">Acontecimentos, ações e comunicados da {orgao.nome}.</p>

      {categorias.length > 0 && (
        <nav aria-label="Categorias" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {[{ valor: "", rotulo: "Todas" }, ...categorias.map((c) => ({ valor: c, rotulo: c }))].map((c) => {
              const atual = c.valor === categoria;
              return (
                <li key={c.valor}>
                  <Link
                    href={c.valor ? `?${new URLSearchParams({ categoria: c.valor })}` : "?"}
                    aria-current={atual ? "page" : undefined}
                    className={`block rounded-full border px-3 py-1 text-sm no-underline ${
                      atual ? "faixa-orgao border-orgao bg-orgao font-semibold text-white" : "border-borda text-texto hover:border-orgao"
                    }`}
                  >
                    {c.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}

      <p className="mt-6 text-texto-suave" role="status">{count ?? 0} notícia(s){categoria ? ` em ${categoria}` : ""}.</p>
      <ul className="mt-3 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((n) => (
          <li key={n.id}><CartaoNoticia base={base} noticia={n} nivel={2} /></li>
        ))}
      </ul>

      <nav aria-label="Paginação" className="mt-8 flex gap-4">
        {pagina > 1 && <Link href={link(pagina - 1)}>Anteriores</Link>}
        <span>Página {pagina} de {totalPaginas}</span>
        {pagina < totalPaginas && <Link href={link(pagina + 1)}>Mais antigas</Link>}
      </nav>
    </>
  );
}
