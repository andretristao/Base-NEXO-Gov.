import type { Metadata } from "next";
import Link from "next/link";
import { Icone } from "@/components/Icone";
import { exigirOrgao } from "@/lib/dal";
import { normalizar, servicosDoOrgao } from "@/lib/portal";
import { formatarData, identificacao } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Busca" };

const LIMITE = 20;

export default async function Busca({ params, searchParams }: PageProps<"/[orgao]/busca">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);
  const { q } = await searchParams;
  const termo = (typeof q === "string" ? q : "").trim();
  const filtro = termo.replace(/[,()%]/g, " ").trim();
  const base = `/${orgao.slug}`;

  const palavras = normalizar(filtro).split(/\s+/).filter(Boolean);
  const servicos = palavras.length
    ? servicosDoOrgao(orgao).filter((s) => {
        const alvo = normalizar(`${s.titulo} ${s.texto} ${s.termos ?? ""}`);
        return palavras.every((p) => alvo.includes(p));
      })
    : [];

  const config = await carregarConfiguracao(orgao.id);
  const publicos = config.tipos.filter((t) => t.publico);
  const tipos = new Map(publicos.map((t) => [t.id, t]));
  const documentos = filtro && publicos.length
    ? (await (await createClient())
        .from("documentos")
        .select("id, numero, ano, assunto, tipo_id, publicado_em", { count: "exact" })
        .eq("orgao_id", orgao.id)
        .not("publicado_em", "is", null)
        .in("tipo_id", publicos.map((t) => t.id))
        .or(`assunto.ilike.%${filtro}%,texto.ilike.%${filtro}%,interessado.ilike.%${filtro}%`)
        .order("publicado_em", { ascending: false })
        .limit(LIMITE))
    : { data: [], count: 0 };

  const noticias = filtro
    ? (await (await createClient())
        .from("noticias")
        .select("id, titulo, resumo, publicado_em", { count: "exact" })
        .eq("orgao_id", orgao.id)
        .eq("publicada", true)
        .lte("publicado_em", new Date().toISOString())
        .or(`titulo.ilike.%${filtro}%,resumo.ilike.%${filtro}%,corpo.ilike.%${filtro}%`)
        .order("publicado_em", { ascending: false })
        .limit(LIMITE))
    : { data: [], count: 0 };

  const total = servicos.length + (documentos.count ?? 0) + (noticias.count ?? 0);

  return (
    <>
      <h1 className="text-2xl font-bold">Busca no portal</h1>
      <form role="search" aria-label="Refinar busca" className="mt-4 flex max-w-2xl gap-2">
        <label htmlFor="q" className="sr-only">Termo de busca</label>
        <input id="q" name="q" type="search" defaultValue={termo} placeholder="O que você procura?"
          className="min-w-0 flex-1 rounded border border-borda bg-fundo px-3 py-2" />
        <button type="submit" className="botao-primario">Buscar</button>
      </form>

      {termo ? (
        <p className="mt-4 text-texto-suave" role="status">
          {total} resultado(s) para “{termo}”.
        </p>
      ) : (
        <p className="mt-4 text-texto-suave">Digite uma palavra, como “lei”, “ata” ou o assunto que procura.</p>
      )}

      {servicos.length > 0 && (
        <section aria-labelledby="titulo-servicos" className="mt-8">
          <h2 id="titulo-servicos" className="text-xl font-semibold">Serviços</h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {servicos.map((s) => (
              <li key={s.caminho} className="flex gap-3 rounded-lg border border-borda p-4">
                <Icone nome={s.icone} className="h-6 w-6 text-orgao" />
                <div>
                  {s.disponivel
                    ? <Link href={`${base}/${s.caminho}`} className="font-semibold">{s.titulo}</Link>
                    : <span className="font-semibold">{s.titulo} <span className="text-sm font-normal text-texto-suave">(em breve)</span></span>}
                  <p className="text-sm text-texto-suave">{s.texto}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(noticias.data?.length ?? 0) > 0 && (
        <section aria-labelledby="titulo-noticias" className="mt-8">
          <h2 id="titulo-noticias" className="text-xl font-semibold">Notícias</h2>
          <ul className="mt-3 divide-y divide-borda">
            {noticias.data!.map((n) => (
              <li key={n.id} className="py-3">
                <Link href={`${base}/noticias/${n.id}`} className="font-semibold">{n.titulo}</Link>
                {n.resumo && <p>{n.resumo}</p>}
                <p className="text-sm text-texto-suave">Publicada em {formatarData(n.publicado_em)}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(documentos.data?.length ?? 0) > 0 && (
        <section aria-labelledby="titulo-documentos" className="mt-8">
          <h2 id="titulo-documentos" className="text-xl font-semibold">Documentos publicados</h2>
          <ul className="mt-3 divide-y divide-borda">
            {documentos.data!.map((d) => {
              const t = tipos.get(d.tipo_id)!;
              return (
                <li key={d.id} className="py-3">
                  <Link href={`${base}/documentos/${d.id}`} className="font-semibold">
                    {t.nome} · {identificacao(t.sigla, d.numero, d.ano)}
                  </Link>
                  <p>{d.assunto}</p>
                  <p className="text-sm text-texto-suave">Publicado em {formatarData(d.publicado_em)}</p>
                </li>
              );
            })}
          </ul>
          {(documentos.count ?? 0) > LIMITE && (
            <p className="mt-3">
              <Link href={`${base}/documentos?${new URLSearchParams({ q: filtro })}`}>Ver todos os {documentos.count} documentos</Link>
            </p>
          )}
        </section>
      )}
    </>
  );
}
