import type { Metadata } from "next";
import Link from "next/link";
import { CampoSelecao } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { formatarData, identificacao, situacaoDocumento } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Documentos" };

const POR_PAGINA = 30;

const SITUACOES = [
  { valor: "tramitacao", rotulo: "Em tramitação" },
  { valor: "concluido", rotulo: "Concluídos" },
  { valor: "arquivado", rotulo: "Arquivados" },
];

export default async function Documentos({ params, searchParams }: PageProps<"/[orgao]/painel/documentos">) {
  const { orgao: slug } = await params;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const filtros = await searchParams;
  const ler = (k: string) => (typeof filtros[k] === "string" ? (filtros[k] as string) : "");
  const tipo = ler("tipo");
  const setor = ler("setor");
  const situacao = ler("situacao");
  const busca = ler("q").replace(/[,()%]/g, " ").trim();
  const pagina = Math.max(1, Number(ler("pagina")) || 1);

  const config = await carregarConfiguracao(orgao.id);
  const tipos = new Map(config.tipos.map((t) => [t.id, t]));
  const etapas = new Map(config.etapas.map((e) => [e.id, e]));
  const setores = new Map(config.setores.map((s) => [s.id, s]));

  const supabase = await createClient();
  let consulta = supabase
    .from("documentos")
    .select("id, protocolo, numero, ano, assunto, tipo_id, etapa_id, setor_id, criado_em, publicado_em, arquivado_em", { count: "exact" })
    .eq("orgao_id", orgao.id);
  if (tipo) consulta = consulta.eq("tipo_id", tipo);
  if (setor) consulta = consulta.eq("setor_id", setor);
  if (situacao === "tramitacao") consulta = consulta.is("publicado_em", null).is("arquivado_em", null);
  if (situacao === "concluido") consulta = consulta.not("publicado_em", "is", null).is("arquivado_em", null);
  if (situacao === "arquivado") consulta = consulta.not("arquivado_em", "is", null);
  if (busca) consulta = consulta.or(`assunto.ilike.%${busca}%,protocolo.ilike.%${busca}%,interessado.ilike.%${busca}%`);
  const { data, count } = await consulta
    .order("criado_em", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));
  const link = (p: number) => {
    const q = new URLSearchParams({ tipo, setor, situacao, q: busca, pagina: String(p) });
    return `?${q}`;
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Documentos</h1>
        {papel !== "consulta" && config.tipos.length > 0 && (
          <Link href={`/${slug}/painel/documentos/novo`} className="botao-primario no-underline">Novo documento</Link>
        )}
      </div>

      {config.tipos.length === 0 && (
        <p className="mt-4 rounded border border-borda bg-fundo-suave p-4">
          Nenhum tipo de documento configurado.{" "}
          {papel === "administrador" || papel === "superadmin"
            ? <Link href={`/${slug}/painel/configuracao`}>Configure o protocolo</Link>
            : "Peça ao administrador para configurar o protocolo."}
        </p>
      )}

      <form role="search" aria-label="Filtrar documentos" className="mt-6 grid items-end gap-3 rounded border border-borda p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <label htmlFor="q" className="block font-semibold">Buscar</label>
          <input id="q" name="q" type="search" defaultValue={busca} placeholder="Assunto, protocolo ou interessado"
            className="mt-1 w-full rounded border border-borda bg-fundo px-3 py-2" />
        </div>
        <CampoSelecao id="tipo" rotulo="Tipo" vazio="Todos" defaultValue={tipo}
          opcoes={config.tipos.map((t) => ({ valor: t.id, rotulo: t.nome }))} />
        <CampoSelecao id="setor" rotulo="Setor atual" vazio="Todos" defaultValue={setor}
          opcoes={config.setores.map((s) => ({ valor: s.id, rotulo: s.nome }))} />
        <CampoSelecao id="situacao" rotulo="Situação" vazio="Todas" defaultValue={situacao} opcoes={SITUACOES} />
        <button type="submit" className="botao-primario lg:col-start-5">Filtrar</button>
      </form>

      <p className="mt-4 text-texto-suave" role="status">{count ?? 0} documento(s) encontrado(s).</p>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Documentos protocolados, mais recentes primeiro</caption>
          <thead>
            <tr className="border-b border-borda">
              <th scope="col" className="py-2 pr-3">Protocolo</th>
              <th scope="col" className="pr-3">Documento</th>
              <th scope="col" className="pr-3">Assunto</th>
              <th scope="col" className="pr-3">Etapa</th>
              <th scope="col" className="pr-3">Setor</th>
              <th scope="col">Data</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((d) => {
              const t = tipos.get(d.tipo_id);
              return (
                <tr key={d.id} className="border-b border-borda align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <Link href={`/${slug}/painel/documentos/${d.id}`}>{d.protocolo}</Link>
                  </td>
                  <td className="pr-3 whitespace-nowrap">{t ? identificacao(t.sigla, d.numero, d.ano) : "—"}</td>
                  <td className="pr-3">{d.assunto}</td>
                  <td className="pr-3">
                    {etapas.get(d.etapa_id)?.nome ?? "—"}
                    <span className="block text-texto-suave">{situacaoDocumento(d)}</span>
                  </td>
                  <td className="pr-3">{d.setor_id ? setores.get(d.setor_id)?.sigla ?? "—" : "—"}</td>
                  <td className="whitespace-nowrap">{formatarData(d.criado_em)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <nav aria-label="Paginação" className="mt-4 flex gap-4">
        {pagina > 1 && <Link href={link(pagina - 1)}>Anterior</Link>}
        <span>Página {pagina} de {totalPaginas}</span>
        {pagina < totalPaginas && <Link href={link(pagina + 1)}>Próxima</Link>}
      </nav>
    </>
  );
}
