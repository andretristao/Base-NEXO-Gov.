import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirOrgao } from "@/lib/dal";
import { formatarData, formatarDataHora, formatarTamanho, identificacao } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documento" };

type Consulta = { movimentacoes: { data: string; etapa: string; setor: string | null }[] } | null;

export default async function DocumentoPublico({ params }: PageProps<"/[orgao]/documentos/[id]">) {
  const { orgao: slug, id } = await params;
  const orgao = await exigirOrgao(slug);
  const supabase = await createClient();

  // Mesmo para membros logados, o portal mostra só o que é público.
  const { data: publico } = await supabase.rpc("documento_publico", { p_documento: id });
  if (!publico) notFound();

  const [{ data: doc }, { data: anexos }] = await Promise.all([
    supabase.from("documentos")
      .select("id, protocolo, numero, ano, assunto, interessado, texto, criado_em, publicado_em, arquivado_em, tipos_documento(nome, sigla)")
      .eq("id", id).eq("orgao_id", orgao.id).maybeSingle(),
    supabase.from("anexos").select("id, nome_arquivo, tamanho").eq("documento_id", id).order("criado_em"),
  ]);
  if (!doc) notFound();
  const tipo = doc.tipos_documento as unknown as { nome: string; sigla: string };
  const { data: consulta } = await supabase.rpc("consultar_protocolo", { p_orgao: orgao.id, p_protocolo: doc.protocolo });
  const historico = (consulta as Consulta)?.movimentacoes ?? [];
  const titulo = identificacao(tipo.sigla, doc.numero, doc.ano);

  return (
    <>
      <p><Link href={`/${slug}/documentos`}>Voltar para documentos publicados</Link></p>
      <h1 className="mt-2 text-2xl font-bold">{tipo.nome} · {titulo}</h1>
      <p className="mt-2 text-lg">{doc.assunto}</p>
      <dl className="mt-4 grid gap-3 rounded border border-borda p-4 sm:grid-cols-4">
        <div><dt className="text-sm text-texto-suave">Protocolo</dt><dd>{doc.protocolo}</dd></div>
        <div><dt className="text-sm text-texto-suave">Autor</dt><dd>{doc.interessado ?? "—"}</dd></div>
        <div><dt className="text-sm text-texto-suave">Apresentado em</dt><dd>{formatarData(doc.criado_em)}</dd></div>
        <div>
          <dt className="text-sm text-texto-suave">Publicado em</dt>
          <dd>{formatarData(doc.publicado_em)}{doc.arquivado_em ? ` · arquivado em ${formatarData(doc.arquivado_em)}` : ""}</dd>
        </div>
      </dl>

      {doc.texto && (
        <section aria-labelledby="titulo-texto" className="mt-8">
          <h2 id="titulo-texto" className="text-xl font-semibold">Texto</h2>
          <div className="mt-3 max-w-3xl whitespace-pre-line">{doc.texto}</div>
        </section>
      )}

      <section aria-labelledby="titulo-arquivos" className="mt-8">
        <h2 id="titulo-arquivos" className="text-xl font-semibold">Arquivos</h2>
        {anexos?.length ? (
          <ul className="mt-3 space-y-1">
            {anexos.map((a) => (
              <li key={a.id}>
                <a href={`/${slug}/anexos/${a.id}`}>{a.nome_arquivo}</a>{" "}
                <span className="text-sm text-texto-suave">({formatarTamanho(a.tamanho)})</span>
              </li>
            ))}
          </ul>
        ) : <p className="mt-2 text-texto-suave">Sem arquivos anexos.</p>}
      </section>

      <section aria-labelledby="titulo-tramitacao" className="mt-8">
        <h2 id="titulo-tramitacao" className="text-xl font-semibold">Tramitação</h2>
        <table className="mt-3 w-full border-collapse text-left text-sm">
          <caption className="sr-only">Tramitação do documento {titulo}</caption>
          <thead>
            <tr className="border-b border-borda">
              <th scope="col" className="py-2 pr-3">Data</th>
              <th scope="col" className="pr-3">Etapa</th>
              <th scope="col">Setor</th>
            </tr>
          </thead>
          <tbody>
            {historico.map((m, i) => (
              <tr key={i} className="border-b border-borda">
                <td className="py-2 pr-3">{formatarDataHora(m.data)}</td>
                <td className="pr-3">{m.etapa}</td>
                <td>{m.setor ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
