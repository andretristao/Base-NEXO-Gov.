import type { Metadata } from "next";
import Link from "next/link";
import { exigirOrgao } from "@/lib/dal";
import { formatarDataHora, nomeSessao, rotuloSituacaoSessao, type SituacaoSessao } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Sessões plenárias" };

export default async function SessoesPublicas({ params }: PageProps<"/[orgao]/sessoes">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);
  const supabase = await createClient();
  const { data: sessoes } = await supabase
    .from("sessoes")
    .select("id, tipo, numero, ano, data_hora, local, situacao")
    .eq("orgao_id", orgao.id)
    .order("data_hora", { ascending: false })
    .limit(60);

  const agora = new Date().toISOString();
  const proximas = (sessoes ?? []).filter((s) => s.situacao === "agendada" && s.data_hora >= agora).reverse();
  const anteriores = (sessoes ?? []).filter((s) => !proximas.includes(s));

  const lista = (itens: typeof proximas, vazio: string) =>
    itens.length ? (
      <ul className="mt-3 divide-y divide-borda">
        {itens.map((s) => (
          <li key={s.id} className="py-3">
            <Link href={`/${slug}/sessoes/${s.id}`} className="font-semibold">{nomeSessao(s.tipo, s.numero, s.ano)}</Link>
            <p className="text-sm text-texto-suave">
              {formatarDataHora(s.data_hora)}{s.local ? ` · ${s.local}` : ""} · {rotuloSituacaoSessao[s.situacao as SituacaoSessao]}
            </p>
          </li>
        ))}
      </ul>
    ) : <p className="mt-2 text-texto-suave">{vazio}</p>;

  return (
    <>
      <h1 className="text-2xl font-bold">Sessões plenárias</h1>
      <p className="mt-1 text-texto-suave">Pautas, resultados e atas das sessões da {orgao.nome}.</p>
      <section aria-labelledby="titulo-proximas" className="mt-8">
        <h2 id="titulo-proximas" className="text-xl font-semibold">Próximas sessões</h2>
        {lista(proximas, "Nenhuma sessão agendada.")}
      </section>
      <section aria-labelledby="titulo-anteriores" className="mt-8">
        <h2 id="titulo-anteriores" className="text-xl font-semibold">Sessões anteriores</h2>
        {lista(anteriores, "Nenhuma sessão registrada.")}
      </section>
    </>
  );
}
