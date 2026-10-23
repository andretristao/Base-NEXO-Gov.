import type { Metadata } from "next";
import { Campo, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { excluirConfiguracao, salvarConfiguracao } from "../actions";

export const metadata: Metadata = { title: "Fases da sessão" };

export default async function Fases({ params }: PageProps<"/[orgao]/painel/configuracao/fases">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const { fases } = await carregarConfiguracao(orgao.id);

  return (
    <>
      <h1 className="text-2xl font-bold">Fases da sessão</h1>
      <p className="mt-1 text-texto-suave">Partes da pauta das sessões, na ordem em que acontecem.</p>

      <ul className="mt-6 space-y-3">
        {fases.map((f) => (
          <li key={f.id} className="rounded border border-borda p-4">
            <Formulario acao={salvarConfiguracao} botao="Salvar" className="grid items-end gap-3 sm:grid-cols-[1fr_6rem_auto_auto]">
              <input type="hidden" name="orgao" value={slug} />
              <input type="hidden" name="tabela" value="fases_sessao" />
              <input type="hidden" name="id" value={f.id} />
              <Campo id={`nome-${f.id}`} name="nome" rotulo="Nome" defaultValue={f.nome} required />
              <Campo id={`ordem-${f.id}`} name="ordem" rotulo="Ordem" type="number" min={0} defaultValue={f.ordem} />
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" name="ativo" defaultChecked={f.ativo} /> Ativa
              </label>
            </Formulario>
            <Formulario acao={excluirConfiguracao} botao={<>Excluir<span className="sr-only"> fase {f.nome}</span></>} classeBotao="text-erro underline" className="mt-2 flex items-center gap-3">
              <input type="hidden" name="orgao" value={slug} />
              <input type="hidden" name="tabela" value="fases_sessao" />
              <input type="hidden" name="id" value={f.id} />
            </Formulario>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Nova fase</h2>
      <Formulario acao={salvarConfiguracao} botao="Incluir fase" className="mt-3 max-w-xl space-y-4">
        <input type="hidden" name="orgao" value={slug} />
        <input type="hidden" name="tabela" value="fases_sessao" />
        <input type="hidden" name="ativo" value="on" />
        <Campo id="nome" rotulo="Nome" placeholder="Ex.: Grande Expediente" required />
        <Campo id="ordem" rotulo="Ordem" type="number" min={0} defaultValue={fases.length + 1} />
      </Formulario>
    </>
  );
}
