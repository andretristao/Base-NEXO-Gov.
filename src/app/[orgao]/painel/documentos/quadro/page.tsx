import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcessoOrgao } from "@/lib/dal";
import { identificacao, tempoDecorrido } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";
import { QuadroTramitacao, type CartaoQuadro } from "./QuadroTramitacao";

export const metadata: Metadata = { title: "Quadro de tramitação" };

const COLUNAS = "id, protocolo, numero, ano, assunto, tipo_id, etapa_id, setor_id, atualizado_em, publicado_em, arquivado_em";

export default async function Quadro({ params, searchParams }: PageProps<"/[orgao]/painel/documentos/quadro">) {
  const { orgao: slug } = await params;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const { fluxo: pedido } = await searchParams;
  const config = await carregarConfiguracao(orgao.id);
  const base = `/${slug}/painel`;

  if (!config.fluxos.length) {
    return (
      <>
        <h1 className="text-2xl font-bold">Quadro de tramitação</h1>
        <p className="mt-4">Nenhum fluxo configurado. <Link href={`${base}/configuracao/fluxos`}>Configure os fluxos</Link>.</p>
      </>
    );
  }

  // Abertos por fluxo: mostra nas abas e escolhe o fluxo mais movimentado quando nenhum foi pedido.
  const supabase = await createClient();
  const { data: emAndamento } = await supabase.from("documentos").select("tipo_id").eq("orgao_id", orgao.id)
    .is("publicado_em", null).is("arquivado_em", null).limit(2000);
  const fluxoDoTipo = new Map(config.tipos.map((t) => [t.id, t.fluxo_id]));
  const abertosPorFluxo = new Map<string, number>();
  for (const d of emAndamento ?? []) {
    const f = fluxoDoTipo.get(d.tipo_id);
    if (f) abertosPorFluxo.set(f, (abertosPorFluxo.get(f) ?? 0) + 1);
  }
  const maisMovimentado = [...config.fluxos].sort((a, b) => (abertosPorFluxo.get(b.id) ?? 0) - (abertosPorFluxo.get(a.id) ?? 0))[0];
  const fluxo = config.fluxos.find((f) => f.id === pedido) ?? maisMovimentado;
  const etapas = config.etapas.filter((e) => e.fluxo_id === fluxo.id);
  const tipos = new Map(config.tipos.map((t) => [t.id, t]));
  const idsTipos = config.tipos.filter((t) => t.fluxo_id === fluxo.id).map((t) => t.id);
  const setores = new Map(config.setores.map((s) => [s.id, s]));

  const [abertos, finalizados] = idsTipos.length
    ? await Promise.all([
        supabase.from("documentos").select(COLUNAS).eq("orgao_id", orgao.id).in("tipo_id", idsTipos)
          .is("publicado_em", null).is("arquivado_em", null).order("atualizado_em").limit(500),
        // concluídos e arquivados: só os mais recentes, para o quadro não crescer sem fim
        supabase.from("documentos").select(COLUNAS).eq("orgao_id", orgao.id).in("tipo_id", idsTipos)
          .or("publicado_em.not.is.null,arquivado_em.not.is.null").order("atualizado_em", { ascending: false }).limit(30),
      ])
    : [{ data: [] }, { data: [] }];

  const cartoes: CartaoQuadro[] = [...(abertos.data ?? []), ...(finalizados.data ?? [])].map((d) => {
    const t = tipos.get(d.tipo_id);
    return {
      id: d.id,
      etapa_id: d.etapa_id,
      protocolo: d.protocolo,
      titulo: t ? identificacao(t.sigla, d.numero, d.ano) : d.protocolo,
      assunto: d.assunto,
      setor: d.setor_id ? setores.get(d.setor_id)?.sigla ?? null : null,
      parado: tempoDecorrido(d.atualizado_em),
      finalizado: Boolean(d.publicado_em || d.arquivado_em),
    };
  });

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Quadro de tramitação</h1>
          <p className="text-texto-suave">
            {papel === "consulta"
              ? "Visão por etapa dos documentos em andamento."
              : "Arraste um documento para outra etapa, ou use “Mover para…” no cartão. Cada movimento fica no histórico e na auditoria."}
          </p>
        </div>
        <Link href={`${base}/documentos`}>Ver em lista</Link>
      </div>

      {config.fluxos.length > 1 && (
        <nav aria-label="Fluxos" className="mt-4">
          <ul className="flex flex-wrap gap-2">
            {config.fluxos.map((f) => (
              <li key={f.id}>
                <Link
                  href={`?fluxo=${f.id}`}
                  aria-current={f.id === fluxo.id ? "page" : undefined}
                  className={`block rounded-full border px-3 py-1 text-sm no-underline ${
                    f.id === fluxo.id ? "faixa-orgao border-orgao bg-orgao font-semibold text-white" : "border-borda bg-fundo text-texto hover:border-orgao"
                  }`}
                >
                  {f.nome} <span className="font-normal">({abertosPorFluxo.get(f.id) ?? 0})</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-4">
        <QuadroTramitacao
          key={fluxo.id}
          slug={slug}
          podeMover={papel !== "consulta"}
          colunas={etapas.map((e) => ({
            id: e.id,
            nome: e.nome,
            natureza: e.natureza,
            setor: e.setor_id ? setores.get(e.setor_id)?.nome ?? null : null,
          }))}
          cartoes={cartoes}
        />
      </div>
    </>
  );
}
