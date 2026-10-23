import type { Metadata } from "next";
import Link from "next/link";
import { CampoSelecao } from "@/components/Formulario";
import { exigirOrgao } from "@/lib/dal";
import { formatarData, identificacao } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documentos publicados" };

const POR_PAGINA = 20;

export default async function DocumentosPublicos({ params, searchParams }: PageProps<"/[orgao]/documentos">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);
  const filtros = await searchParams;
  const ler = (k: string) => (typeof filtros[k] === "string" ? (filtros[k] as string) : "");
  const tipo = ler("tipo");
  const ano = ler("ano");
  const busca = ler("q").replace(/[,()%]/g, " ").trim();
  const pagina = Math.max(1, Number(ler("pagina")) || 1);

  const config = await carregarConfiguracao(orgao.id);
  const publicos = config.tipos.filter((t) => t.publico);
  const tipos = new Map(publicos.map((t) => [t.id, t]));

  const supabase = await createClient();
  let consulta = supabase
    .from("documentos")
    .select("id, numero, ano, assunto, interessado, tipo_id, publicado_em", { count: "exact" })
    .eq("orgao_id", orgao.id)
    .not("publicado_em", "is", null)
    .in("tipo_id", publicos.length ? publicos.map((t) => t.id) : ["00000000-0000-0000-0000-000000000000"]);
  if (tipo) consulta = consulta.eq("tipo_id", tipo);
  if (/^\d{4}$/.test(ano)) consulta = consulta.eq("ano", Number(ano));
  if (busca) consulta = consulta.or(`assunto.ilike.%${busca}%,texto.ilike.%${busca}%,interessado.ilike.%${busca}%`);
  const { data, count } = await consulta
    .order("publicado_em", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));
  const link = (p: number) => `?${new URLSearchParams({ tipo, ano, q: busca, pagina: String(p) })}`;
  const anoAtual = new Date().getFullYear();

  return (
    <>
      <h1 className="text-2xl font-bold">Documentos publicados</h1>
      <p className="mt-1 text-texto-suave">
        Proposições, atos e atas concluídos. Para acompanhar um protocolo em andamento, use a{" "}
        <Link href={`/${slug}/protocolo`}>consulta de protocolo</Link>.
      </p>

      <form role="search" aria-label="Filtrar documentos" className="mt-6 grid items-end gap-3 rounded border border-borda p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="q" className="block font-semibold">Buscar</label>
          <input id="q" name="q" type="search" defaultValue={busca} placeholder="Palavra, assunto ou autor"
            className="mt-1 w-full rounded border border-borda bg-fundo px-3 py-2" />
        </div>
        <CampoSelecao id="tipo" rotulo="Tipo" vazio="Todos" defaultValue={tipo}
          opcoes={publicos.map((t) => ({ valor: t.id, rotulo: t.nome }))} />
        <CampoSelecao id="ano" rotulo="Ano" vazio="Todos" defaultValue={ano}
          opcoes={[0, 1, 2, 3, 4].map((i) => ({ valor: String(anoAtual - i), rotulo: String(anoAtual - i) }))} />
        <button type="submit" className="botao-primario">Filtrar</button>
      </form>

      <p className="mt-4 text-texto-suave" role="status">{count ?? 0} documento(s) encontrado(s).</p>
      <ul className="mt-2 divide-y divide-borda">
        {(data ?? []).map((d) => {
          const t = tipos.get(d.tipo_id)!;
          return (
            <li key={d.id} className="py-4">
              <h2 className="font-semibold">
                <Link href={`/${slug}/documentos/${d.id}`}>{t.nome} · {identificacao(t.sigla, d.numero, d.ano)}</Link>
              </h2>
              <p>{d.assunto}</p>
              <p className="text-sm text-texto-suave">
                {d.interessado ? `${d.interessado} · ` : ""}Publicado em {formatarData(d.publicado_em)}
              </p>
            </li>
          );
        })}
      </ul>
      <nav aria-label="Paginação" className="mt-4 flex gap-4">
        {pagina > 1 && <Link href={link(pagina - 1)}>Anterior</Link>}
        <span>Página {pagina} de {totalPaginas}</span>
        {pagina < totalPaginas && <Link href={link(pagina + 1)}>Próxima</Link>}
      </nav>
    </>
  );
}
