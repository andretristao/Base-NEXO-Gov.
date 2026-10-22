import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Auditoria" };

const POR_PAGINA = 50;

const rotuloAcao: Record<string, string> = {
  insert: "Inclusão",
  update: "Alteração",
  delete: "Exclusão",
  login_2fa: "Login com 2FA",
  "2fa_cadastrado": "2FA cadastrado",
};

function camposAlterados(antes: Record<string, unknown> | null, depois: Record<string, unknown> | null) {
  if (!antes || !depois) return null;
  const ignorar = new Set(["atualizado_em"]);
  return Object.keys(depois).filter(
    (k) => !ignorar.has(k) && JSON.stringify(antes[k]) !== JSON.stringify(depois[k]),
  );
}

export default async function Auditoria({ params, searchParams }: PageProps<"/[orgao]/painel/auditoria">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const pagina = Math.max(1, Number((await searchParams).pagina) || 1);

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("auditoria")
    .select("id, acao, tabela, registro_id, dados_antes, dados_depois, detalhes, ip, criado_em, usuario_id", { count: "exact" })
    .eq("orgao_id", orgao.id)
    .order("id", { ascending: false })
    .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);

  const ids = [...new Set((data ?? []).map((r) => r.usuario_id).filter(Boolean))] as string[];
  const { data: pessoas } = ids.length
    ? await supabase.from("usuarios").select("id, nome, email").in("id", ids)
    : { data: [] };
  const nomes = new Map((pessoas ?? []).map((p) => [p.id, p.nome || p.email]));
  const totalPaginas = Math.max(1, Math.ceil((count ?? 0) / POR_PAGINA));
  const formatar = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "America/Sao_Paulo" });

  return (
    <>
      <h1 className="text-2xl font-bold">Trilha de auditoria</h1>
      <p className="mt-1 text-texto-suave">
        Registros imutáveis de alterações e acessos. {count ?? 0} eventos.
      </p>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Eventos de auditoria de {orgao.nome}, mais recentes primeiro</caption>
          <thead>
            <tr className="border-b border-borda">
              <th scope="col" className="py-2 pr-3">Data e hora</th>
              <th scope="col" className="pr-3">Usuário</th>
              <th scope="col" className="pr-3">Ação</th>
              <th scope="col" className="pr-3">Objeto</th>
              <th scope="col" className="pr-3">Campos</th>
              <th scope="col">IP</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((r) => {
              const campos = camposAlterados(r.dados_antes, r.dados_depois);
              return (
                <tr key={r.id} className="border-b border-borda align-top">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatar.format(new Date(r.criado_em))}</td>
                  <td className="pr-3">{r.usuario_id ? nomes.get(r.usuario_id) ?? "—" : "Sistema"}</td>
                  <td className="pr-3">{rotuloAcao[r.acao] ?? r.acao}</td>
                  <td className="pr-3">{r.tabela?.replace("public.", "") ?? "—"}</td>
                  <td className="pr-3">{campos?.length ? campos.join(", ") : "—"}</td>
                  <td>{r.ip || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <nav aria-label="Paginação" className="mt-4 flex gap-4">
        {pagina > 1 && <Link href={`?pagina=${pagina - 1}`}>Anterior</Link>}
        <span>Página {pagina} de {totalPaginas}</span>
        {pagina < totalPaginas && <Link href={`?pagina=${pagina + 1}`}>Próxima</Link>}
      </nav>
    </>
  );
}
