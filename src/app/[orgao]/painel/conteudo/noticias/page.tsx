import type { Metadata } from "next";
import Link from "next/link";
import { CampoSelecao } from "@/components/Formulario";
import { Icone } from "@/components/Icone";
import { situacaoNoticia, urlImagem } from "@/lib/conteudo";
import { exigirAcessoOrgao } from "@/lib/dal";
import { formatarDataHora } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notícias" };

const POR_PAGINA = 20;

const SITUACOES = [
  { valor: "publicada", rotulo: "Publicadas" },
  { valor: "rascunho", rotulo: "Rascunhos" },
];

export default async function Noticias({ params, searchParams }: PageProps<"/[orgao]/painel/conteudo/noticias">) {
  const { orgao: slug } = await params;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const filtros = await searchParams;
  const ler = (k: string) => (typeof filtros[k] === "string" ? (filtros[k] as string) : "");
  const situacao = ler("situacao");
  const busca = ler("q").replace(/[,()%]/g, " ").trim();
  const pagina = Math.max(1, Number(ler("pagina")) || 1);

  const supabase = await createClient();
  let consulta = supabase
    .from("noticias")
    .select("id, titulo, categoria, imagem_caminho, imagem_alt, destaque, publicada, publicado_em, atualizado_em", { count: "exact" })
    .eq("orgao_id", orgao.id);
  if (situacao === "publicada") consulta = consulta.eq("publicada", true);
  if (situacao === "rascunho") consulta = consulta.eq("publicada", false);
  if (busca) consulta = consulta.or(`titulo.ilike.%${busca}%,resumo.ilike.%${busca}%,categoria.ilike.%${busca}%`);
  const { data, count } = await consulta
    .order("atualizado_em", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));
  const link = (p: number) => `?${new URLSearchParams({ situacao, q: busca, pagina: String(p) })}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Notícias</h1>
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/${slug}/noticias`}>Ver no portal</Link>
          {papel !== "consulta" && (
            <Link href={`/${slug}/painel/conteudo/noticias/nova`} className="botao-primario flex items-center gap-2 no-underline">
              <Icone nome="mais" className="h-4 w-4" /> Nova notícia
            </Link>
          )}
        </div>
      </div>

      <form role="search" aria-label="Filtrar notícias" className="mt-6 grid items-end gap-3 rounded border border-borda bg-fundo p-4 sm:grid-cols-[1fr_12rem_auto]">
        <div>
          <label htmlFor="q" className="block font-semibold">Buscar</label>
          <input id="q" name="q" type="search" defaultValue={busca} placeholder="Título, resumo ou categoria"
            className="mt-1 w-full rounded border border-borda bg-fundo px-3 py-2" />
        </div>
        <CampoSelecao id="situacao" rotulo="Situação" vazio="Todas" defaultValue={situacao} opcoes={SITUACOES} />
        <button type="submit" className="botao-primario">Filtrar</button>
      </form>

      <p className="mt-4 text-texto-suave" role="status">{count ?? 0} notícia(s).</p>
      {data?.length ? (
        <ul className="mt-2 divide-y divide-borda rounded border border-borda bg-fundo">
          {data.map((n) => {
            const img = urlImagem(n.imagem_caminho);
            const sit = situacaoNoticia(n);
            return (
              <li key={n.id} className="flex items-center gap-4 p-3">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="h-14 w-24 shrink-0 rounded object-cover" />
                ) : (
                  <span className="flex h-14 w-24 shrink-0 items-center justify-center rounded bg-fundo-suave text-texto-suave">
                    <Icone nome="diario" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/${slug}/painel/conteudo/noticias/${n.id}`} className="font-semibold">{n.titulo}</Link>
                  <p className="text-sm text-texto-suave">
                    {n.categoria ? `${n.categoria} · ` : ""}
                    {n.publicado_em ? formatarDataHora(n.publicado_em) : `editada em ${formatarDataHora(n.atualizado_em)}`}
                    {n.destaque ? " · Destaque" : ""}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  sit === "Publicada" ? "border-sucesso text-sucesso" : "border-borda text-texto-suave"
                }`}>{sit}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-2 rounded border border-dashed border-borda p-6 text-center text-texto-suave">
          Nenhuma notícia ainda.{papel !== "consulta" && <> <Link href={`/${slug}/painel/conteudo/noticias/nova`}>Escreva a primeira</Link>.</>}
        </p>
      )}
      <nav aria-label="Paginação" className="mt-4 flex gap-4">
        {pagina > 1 && <Link href={link(pagina - 1)}>Anterior</Link>}
        <span>Página {pagina} de {totalPaginas}</span>
        {pagina < totalPaginas && <Link href={link(pagina + 1)}>Próxima</Link>}
      </nav>
    </>
  );
}
