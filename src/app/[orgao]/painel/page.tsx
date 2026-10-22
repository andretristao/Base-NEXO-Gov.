import type { Metadata } from "next";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Área restrita" };

const modulos = [
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
  const { count } = await supabase
    .from("membros")
    .select("*", { count: "exact", head: true })
    .eq("orgao_id", orgao.id)
    .eq("ativo", true);

  return (
    <>
      <h1 className="text-2xl font-bold">Área restrita · {orgao.nome}</h1>
      <dl className="mt-6 grid gap-4 sm:grid-cols-2">
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
