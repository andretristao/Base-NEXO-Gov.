import type { Metadata } from "next";
import Link from "next/link";
import { Campo, CampoSelecao, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { formatarDataHora, nomeSessao, rotuloSituacaoSessao, rotuloTipoSessao, type TipoSessao } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";
import { criarSessao } from "./actions";

export const metadata: Metadata = { title: "Sessões" };

const TIPOS = (Object.entries(rotuloTipoSessao) as [TipoSessao, string][]).map(([valor, rotulo]) => ({ valor, rotulo }));

export default async function Sessoes({ params }: PageProps<"/[orgao]/painel/sessoes">) {
  const { orgao: slug } = await params;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const supabase = await createClient();
  const { data: sessoes } = await supabase
    .from("sessoes")
    .select("id, tipo, numero, ano, data_hora, local, situacao, ata_documento_id")
    .eq("orgao_id", orgao.id)
    .order("data_hora", { ascending: false })
    .limit(100);

  return (
    <>
      <h1 className="text-2xl font-bold">Sessões</h1>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Sessões plenárias, mais recentes primeiro</caption>
          <thead>
            <tr className="border-b border-borda">
              <th scope="col" className="py-2 pr-3">Sessão</th>
              <th scope="col" className="pr-3">Data e hora</th>
              <th scope="col" className="pr-3">Local</th>
              <th scope="col" className="pr-3">Situação</th>
              <th scope="col">Ata</th>
            </tr>
          </thead>
          <tbody>
            {(sessoes ?? []).map((s) => (
              <tr key={s.id} className="border-b border-borda">
                <td className="py-2 pr-3"><Link href={`/${slug}/painel/sessoes/${s.id}`}>{nomeSessao(s.tipo, s.numero, s.ano)}</Link></td>
                <td className="pr-3 whitespace-nowrap">{formatarDataHora(s.data_hora)}</td>
                <td className="pr-3">{s.local ?? "—"}</td>
                <td className="pr-3">{rotuloSituacaoSessao[s.situacao as keyof typeof rotuloSituacaoSessao]}</td>
                <td>{s.ata_documento_id ? <Link href={`/${slug}/painel/documentos/${s.ata_documento_id}`}>Ver ata</Link> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!sessoes?.length && <p className="mt-3 text-texto-suave">Nenhuma sessão agendada.</p>}
      </div>

      {papel !== "consulta" && (
        <>
          <h2 id="agendar" className="mt-10 scroll-mt-4 text-xl font-semibold">Agendar sessão</h2>
          <p className="text-sm text-texto-suave">O número da sessão é sequencial por tipo e ano.</p>
          <Formulario acao={criarSessao} botao="Agendar" className="mt-3 grid max-w-2xl gap-4 sm:grid-cols-2">
            <input type="hidden" name="orgao" value={slug} />
            <CampoSelecao id="tipo" rotulo="Tipo" opcoes={TIPOS} defaultValue="ordinaria" />
            <Campo id="local" rotulo="Local" defaultValue="Plenário" />
            <Campo id="data" rotulo="Data" type="date" required />
            <Campo id="hora" rotulo="Horário" type="time" defaultValue="19:00" required />
          </Formulario>
        </>
      )}
    </>
  );
}
