import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { CartaoNoticia } from "@/components/CartaoNoticia";
import { paragrafos, urlImagem, type Noticia } from "@/lib/conteudo";
import { exigirOrgao } from "@/lib/dal";
import { formatarDataExtenso, formatarHora } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const carregar = cache(async (slug: string, id: string) => {
  if (!UUID.test(id)) return null;
  const orgao = await exigirOrgao(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("noticias").select("*").eq("id", id).eq("orgao_id", orgao.id)
    .eq("publicada", true).lte("publicado_em", new Date().toISOString()).maybeSingle();
  return data as Noticia | null;
});

export async function generateMetadata({ params }: PageProps<"/[orgao]/noticias/[id]">): Promise<Metadata> {
  const { orgao, id } = await params;
  const noticia = await carregar(orgao, id);
  return noticia ? { title: noticia.titulo, description: noticia.resumo ?? undefined } : {};
}

export default async function NoticiaPublica({ params }: PageProps<"/[orgao]/noticias/[id]">) {
  const { orgao: slug, id } = await params;
  const orgao = await exigirOrgao(slug);
  const noticia = await carregar(slug, id);
  if (!noticia) notFound();
  const base = `/${orgao.slug}`;
  const img = urlImagem(noticia.imagem_caminho);

  const supabase = await createClient();
  const { data: outras } = await supabase
    .from("noticias")
    .select("id, titulo, resumo, categoria, imagem_caminho, imagem_alt, publicado_em")
    .eq("orgao_id", orgao.id).eq("publicada", true).lte("publicado_em", new Date().toISOString()).neq("id", noticia.id)
    .order("publicado_em", { ascending: false }).limit(3);

  return (
    <>
      <nav aria-label="Você está em" className="text-sm">
        <Link href={base}>Início</Link> <span aria-hidden="true">›</span> <Link href={`${base}/noticias`}>Notícias</Link>
      </nav>
      <article className="mx-auto mt-4 max-w-3xl">
        {noticia.categoria && (
          <p className="text-sm font-semibold text-orgao">
            <Link href={`${base}/noticias?${new URLSearchParams({ categoria: noticia.categoria })}`} className="text-orgao">{noticia.categoria}</Link>
          </p>
        )}
        <h1 className="mt-1 text-3xl font-bold leading-tight sm:text-4xl">{noticia.titulo}</h1>
        {noticia.resumo && <p className="mt-3 text-lg text-texto-suave">{noticia.resumo}</p>}
        {noticia.publicado_em && (
          <p className="mt-3 text-sm text-texto-suave">
            Publicado em <time dateTime={noticia.publicado_em}>{formatarDataExtenso(noticia.publicado_em)}, às {formatarHora(noticia.publicado_em)}</time>
          </p>
        )}
        {img && (
          <figure className="mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={noticia.imagem_alt ?? ""} className="w-full rounded-lg object-cover" />
          </figure>
        )}
        <div className="mt-6 space-y-4 text-lg leading-relaxed">
          {paragrafos(noticia.corpo).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
        </div>
      </article>

      {outras && outras.length > 0 && (
        <section aria-labelledby="titulo-outras" className="mt-12 border-t border-borda pt-8">
          <h2 id="titulo-outras" className="text-xl font-bold">Outras notícias</h2>
          <ul className="mt-4 grid gap-6 sm:grid-cols-3">
            {outras.map((n) => <li key={n.id}><CartaoNoticia base={base} noticia={n} /></li>)}
          </ul>
        </section>
      )}
    </>
  );
}
