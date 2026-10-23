import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirOrgao } from "@/lib/dal";
import {
  formatarDataHora, nomeSessao, rotuloResultado, rotuloSituacaoSessao, type ResultadoPauta, type SituacaoSessao,
} from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sessão plenária" };

export default async function SessaoPublica({ params }: PageProps<"/[orgao]/sessoes/[id]">) {
  const { orgao: slug, id } = await params;
  const orgao = await exigirOrgao(slug);
  const supabase = await createClient();
  const [{ data: sessao }, { data: itens }, config] = await Promise.all([
    supabase.from("sessoes").select("*").eq("id", id).eq("orgao_id", orgao.id).maybeSingle(),
    supabase.from("pauta_itens").select("id, fase_id, ordem, descricao, resultado, documento_id").eq("sessao_id", id).order("ordem"),
    carregarConfiguracao(orgao.id),
  ]);
  if (!sessao) notFound();

  // Só liga para documentos e ata que estejam publicados.
  const ids = [sessao.ata_documento_id, ...(itens ?? []).map((i) => i.documento_id)].filter(Boolean) as string[];
  const { data: visiveis } = ids.length
    ? await supabase.from("documentos").select("id, tipos_documento!inner(publico)")
        .in("id", ids).not("publicado_em", "is", null).eq("tipos_documento.publico", true)
    : { data: [] };
  const publicados = new Set((visiveis ?? []).map((d) => d.id));
  const titulo = nomeSessao(sessao.tipo, sessao.numero, sessao.ano);
  const fases = config.fases.filter((f) => itens?.some((i) => i.fase_id === f.id));

  return (
    <>
      <p><Link href={`/${slug}/sessoes`}>Voltar para sessões</Link></p>
      <h1 className="mt-2 text-2xl font-bold">{titulo}</h1>
      <p className="mt-1">
        {formatarDataHora(sessao.data_hora)}{sessao.local ? ` · ${sessao.local}` : ""} · {rotuloSituacaoSessao[sessao.situacao as SituacaoSessao]}
      </p>
      {sessao.ata_documento_id && publicados.has(sessao.ata_documento_id) && (
        <p className="mt-3"><Link href={`/${slug}/documentos/${sessao.ata_documento_id}`}>Ler a ata da sessão</Link></p>
      )}

      <h2 className="mt-8 text-xl font-semibold">Pauta</h2>
      {fases.length === 0 && <p className="mt-2 text-texto-suave">Pauta ainda não divulgada.</p>}
      {fases.map((f) => (
        <section key={f.id} aria-labelledby={`fase-${f.id}`} className="mt-5">
          <h3 id={`fase-${f.id}`} className="text-lg font-semibold">{f.nome}</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-6">
            {(itens ?? []).filter((i) => i.fase_id === f.id).map((i) => (
              <li key={i.id}>
                {i.documento_id && publicados.has(i.documento_id)
                  ? <Link href={`/${slug}/documentos/${i.documento_id}`}>{i.descricao}</Link>
                  : i.descricao}
                {i.resultado && <strong> · {rotuloResultado[i.resultado as ResultadoPauta]}</strong>}
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
