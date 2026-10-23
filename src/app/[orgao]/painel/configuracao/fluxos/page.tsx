import type { Metadata } from "next";
import { Campo, CampoSelecao, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { rotuloNatureza, type NaturezaEtapa } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { excluirConfiguracao, salvarConfiguracao } from "../actions";

export const metadata: Metadata = { title: "Fluxos e etapas" };

const NATUREZAS = (Object.entries(rotuloNatureza) as [NaturezaEtapa, string][])
  .map(([valor, rotulo]) => ({ valor, rotulo }));

export default async function Fluxos({ params }: PageProps<"/[orgao]/painel/configuracao/fluxos">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const { fluxos, etapas, setores } = await carregarConfiguracao(orgao.id);
  const opcoesSetor = setores.filter((s) => s.ativo).map((s) => ({ valor: s.id, rotulo: `${s.nome} (${s.sigla})` }));

  const ocultos = (tabela: string, id?: string) => (
    <>
      <input type="hidden" name="orgao" value={slug} />
      <input type="hidden" name="tabela" value={tabela} />
      {id && <input type="hidden" name="id" value={id} />}
    </>
  );

  return (
    <>
      <h1 className="text-2xl font-bold">Fluxos e etapas</h1>
      <p className="mt-1 text-texto-suave">
        O documento começa na etapa de menor ordem. Etapas de conclusão publicam o documento e só gestores ou
        administradores podem enviá-lo para elas.
      </p>

      {fluxos.map((f) => {
        const doFluxo = etapas.filter((e) => e.fluxo_id === f.id);
        return (
          <section key={f.id} aria-labelledby={`fluxo-${f.id}`} className="mt-8 rounded border border-borda p-5">
            <h2 id={`fluxo-${f.id}`} className="text-xl font-semibold">Fluxo {f.nome}</h2>
            <Formulario acao={salvarConfiguracao} botao="Salvar fluxo" className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_2fr_auto]">
              {ocultos("fluxos", f.id)}
              <Campo id={`fluxo-nome-${f.id}`} name="nome" rotulo="Nome do fluxo" defaultValue={f.nome} required />
              <Campo id={`fluxo-descricao-${f.id}`} name="descricao" rotulo="Descrição" defaultValue={f.descricao ?? ""} />
            </Formulario>

            <h3 className="mt-6 font-semibold">Etapas</h3>
            <ol className="mt-2 space-y-3">
              {doFluxo.map((e) => (
                <li key={e.id} className="rounded bg-fundo-suave p-3">
                  <Formulario acao={salvarConfiguracao} botao="Salvar" className="grid items-end gap-3 sm:grid-cols-[5rem_1fr_1fr_1fr_auto]">
                    {ocultos("etapas", e.id)}
                    <input type="hidden" name="fluxo_id" value={f.id} />
                    <Campo id={`ordem-${e.id}`} name="ordem" rotulo="Ordem" type="number" min={0} defaultValue={e.ordem} />
                    <Campo id={`nome-${e.id}`} name="nome" rotulo="Status" defaultValue={e.nome} required />
                    <CampoSelecao id={`setor-${e.id}`} name="setor_id" rotulo="Setor responsável" opcoes={opcoesSetor} vazio="Nenhum" defaultValue={e.setor_id ?? ""} />
                    <CampoSelecao id={`natureza-${e.id}`} name="natureza" rotulo="Natureza" opcoes={NATUREZAS} defaultValue={e.natureza} />
                  </Formulario>
                  <Formulario acao={excluirConfiguracao} botao={<>Excluir<span className="sr-only"> etapa {e.nome}</span></>} classeBotao="text-erro underline" className="mt-2 flex items-center gap-3">
                    {ocultos("etapas", e.id)}
                  </Formulario>
                </li>
              ))}
            </ol>

            <h3 className="mt-6 font-semibold">Nova etapa em {f.nome}</h3>
            <Formulario acao={salvarConfiguracao} botao="Incluir etapa" className="mt-2 grid items-end gap-3 sm:grid-cols-[5rem_1fr_1fr_1fr_auto]">
              {ocultos("etapas")}
              <input type="hidden" name="fluxo_id" value={f.id} />
              <Campo id={`nova-ordem-${f.id}`} name="ordem" rotulo="Ordem" type="number" min={0} defaultValue={doFluxo.length + 1} />
              <Campo id={`nova-nome-${f.id}`} name="nome" rotulo="Status" placeholder="Ex.: Jurídico" required />
              <CampoSelecao id={`nova-setor-${f.id}`} name="setor_id" rotulo="Setor responsável" opcoes={opcoesSetor} vazio="Nenhum" />
              <CampoSelecao id={`nova-natureza-${f.id}`} name="natureza" rotulo="Natureza" opcoes={NATUREZAS} />
            </Formulario>

            <Formulario acao={excluirConfiguracao} botao={<>Excluir fluxo<span className="sr-only"> {f.nome}</span></>} classeBotao="text-erro underline" className="mt-6 flex items-center gap-3">
              {ocultos("fluxos", f.id)}
            </Formulario>
          </section>
        );
      })}

      <h2 className="mt-10 text-xl font-semibold">Novo fluxo</h2>
      <Formulario acao={salvarConfiguracao} botao="Incluir fluxo" className="mt-3 max-w-xl space-y-4">
        {ocultos("fluxos")}
        <Campo id="nome" rotulo="Nome" placeholder="Ex.: Licitações" required />
        <Campo id="descricao" rotulo="Descrição" />
      </Formulario>
    </>
  );
}
