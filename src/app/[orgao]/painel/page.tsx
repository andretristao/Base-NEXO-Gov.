import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Área restrita" };

const modulos = [
  { nome: "Protocolo e processo legislativo", situacao: "Disponível" },
  { nome: "Diário Oficial", situacao: "Em construção" },
  { nome: "Portal da Transparência", situacao: "Em construção" },
  { nome: "Integração PNCP", situacao: "Em construção" },
  { nome: "Cesta de preços", situacao: "Planejado" },
  { nome: "Ouvidoria e e-SIC", situacao: "Planejado" },
];

export default async function ResumoPainel({ params }: PageProps<"/[orgao]/painel">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug);
  const supabase = await createClient();
  const contar = (tabela: string) => supabase.from(tabela).select("*", { count: "exact", head: true }).eq("orgao_id", orgao.id);
  const [{ count }, { count: emTramitacao }, { count: concluidos }, { count: agendadas }] = await Promise.all([
    contar("membros").eq("ativo", true),
    contar("documentos").is("publicado_em", null).is("arquivado_em", null),
    contar("documentos").not("publicado_em", "is", null),
    contar("sessoes").eq("situacao", "agendada"),
  ]);

  return (
    <>
      <h1 className="text-2xl font-bold">Área restrita · {orgao.nome}</h1>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded border border-borda p-4">
          <dt className="text-sm text-texto-suave">Documentos em tramitação</dt>
          <dd className="text-2xl font-bold">
            <Link href={`/${slug}/painel/documentos?situacao=tramitacao`}>{emTramitacao ?? 0}</Link>
          </dd>
        </div>
        <div className="rounded border border-borda p-4">
          <dt className="text-sm text-texto-suave">Documentos concluídos</dt>
          <dd className="text-2xl font-bold">{concluidos ?? 0}</dd>
        </div>
        {orgao.tipo === "camara" && (
          <div className="rounded border border-borda p-4">
            <dt className="text-sm text-texto-suave">Sessões agendadas</dt>
            <dd className="text-2xl font-bold"><Link href={`/${slug}/painel/sessoes`}>{agendadas ?? 0}</Link></dd>
          </div>
        )}
        <div className="rounded border border-borda p-4">
          <dt className="text-sm text-texto-suave">Usuários ativos</dt>
          <dd className="text-2xl font-bold">{count ?? "—"}</dd>
        </div>
        <div className="rounded border border-borda p-4">
          <dt className="text-sm text-texto-suave">2FA obrigatório</dt>
          <dd className="text-2xl font-bold">{orgao.exigir_2fa ? "Sim" : "Não"}</dd>
        </div>
      </dl>
      <h2 className="mt-8 text-xl font-semibold">Módulos</h2>
      <table className="mt-3 w-full border-collapse text-left">
        <caption className="sr-only">Situação dos módulos contratados</caption>
        <thead>
          <tr className="border-b border-borda"><th scope="col" className="py-2">Módulo</th><th scope="col">Situação</th></tr>
        </thead>
        <tbody>
          {modulos.map((m) => (
            <tr key={m.nome} className="border-b border-borda"><td className="py-2">{m.nome}</td><td>{m.situacao}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
