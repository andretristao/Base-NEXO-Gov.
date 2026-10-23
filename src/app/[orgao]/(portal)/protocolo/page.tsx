import type { Metadata } from "next";
import Link from "next/link";
import { exigirOrgao } from "@/lib/dal";
import { formatarData, formatarDataHora, identificacao } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Consulta de protocolo" };

type Resultado = {
  id: string | null;
  protocolo: string;
  tipo: string;
  sigla: string;
  numero: number;
  ano: number;
  assunto: string | null;
  etapa: string;
  setor: string | null;
  criado_em: string;
  publicado_em: string | null;
  arquivado_em: string | null;
  movimentacoes: { data: string; etapa: string; setor: string | null }[];
};

export default async function ConsultaProtocolo({ params, searchParams }: PageProps<"/[orgao]/protocolo">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);
  const { numero } = await searchParams;
  const informado = typeof numero === "string" ? numero.trim() : "";

  let resultado: Resultado | null = null;
  if (informado) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("consultar_protocolo", { p_orgao: orgao.id, p_protocolo: informado });
    resultado = data as Resultado | null;
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Consulta de protocolo</h1>
      <p className="mt-1 text-texto-suave">Acompanhe em que etapa e setor está um documento protocolado na {orgao.nome}.</p>

      <form role="search" aria-label="Consultar protocolo" className="mt-6 flex max-w-xl flex-wrap items-end gap-3">
        <div className="flex-1">
          <label htmlFor="numero" className="block font-semibold">Número do protocolo</label>
          <p id="numero-ajuda" className="text-sm text-texto-suave">No formato ano/número, por exemplo 2026/000012.</p>
          <input id="numero" name="numero" defaultValue={informado} required aria-describedby="numero-ajuda"
            pattern="\d{4}/\d{1,6}" className="mt-1 w-full rounded border border-borda bg-fundo px-3 py-2" />
        </div>
        <button type="submit" className="botao-primario">Consultar</button>
      </form>

      <div role="status" aria-live="polite" className="mt-8">
        {informado && !resultado && (
          <p className="font-semibold text-erro">Protocolo {informado} não encontrado. Confira o número e tente de novo.</p>
        )}
        {resultado && (
          <section aria-labelledby="titulo-resultado" className="rounded border border-borda p-5">
            <h2 id="titulo-resultado" className="text-xl font-semibold">
              Protocolo {resultado.protocolo} · {resultado.tipo} {identificacao(resultado.sigla, resultado.numero, resultado.ano)}
            </h2>
            {resultado.assunto && <p className="mt-2">{resultado.assunto}</p>}
            <dl className="mt-4 grid gap-3 sm:grid-cols-3">
              <div><dt className="text-sm text-texto-suave">Etapa atual</dt><dd className="font-semibold">{resultado.etapa}</dd></div>
              <div><dt className="text-sm text-texto-suave">Setor</dt><dd>{resultado.setor ?? "—"}</dd></div>
              <div><dt className="text-sm text-texto-suave">Protocolado em</dt><dd>{formatarData(resultado.criado_em)}</dd></div>
            </dl>
            {resultado.id && (
              <p className="mt-3"><Link href={`/${slug}/documentos/${resultado.id}`}>Ver o documento publicado</Link></p>
            )}
            <table className="mt-5 w-full border-collapse text-left text-sm">
              <caption className="text-left font-semibold">Movimentações</caption>
              <thead>
                <tr className="border-b border-borda">
                  <th scope="col" className="py-2 pr-3">Data</th>
                  <th scope="col" className="pr-3">Etapa</th>
                  <th scope="col">Setor</th>
                </tr>
              </thead>
              <tbody>
                {resultado.movimentacoes.map((m, i) => (
                  <tr key={i} className="border-b border-borda">
                    <td className="py-2 pr-3">{formatarDataHora(m.data)}</td>
                    <td className="pr-3">{m.etapa}</td>
                    <td>{m.setor ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </>
  );
}
