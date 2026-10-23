import type { Metadata } from "next";
import { Campo, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { excluirConfiguracao, salvarConfiguracao } from "../actions";

export const metadata: Metadata = { title: "Setores" };

export default async function Setores({ params }: PageProps<"/[orgao]/painel/configuracao/setores">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const { setores } = await carregarConfiguracao(orgao.id);

  return (
    <>
      <h1 className="text-2xl font-bold">Setores</h1>
      <p className="mt-1 text-texto-suave">Setor inativo deixa de aparecer na tramitação, mas o histórico continua com o nome dele.</p>

      <ul className="mt-6 space-y-3">
        {setores.map((s) => (
          <li key={s.id} className="rounded border border-borda p-4">
            <Formulario acao={salvarConfiguracao} botao="Salvar" className="grid items-end gap-3 sm:grid-cols-[1fr_8rem_auto_auto]">
              <input type="hidden" name="orgao" value={slug} />
              <input type="hidden" name="tabela" value="setores" />
              <input type="hidden" name="id" value={s.id} />
              <Campo id={`nome-${s.id}`} name="nome" rotulo="Nome" defaultValue={s.nome} required />
              <Campo id={`sigla-${s.id}`} name="sigla" rotulo="Sigla" defaultValue={s.sigla} required />
              <label className="flex items-center gap-2 pb-2">
                <input type="checkbox" name="ativo" defaultChecked={s.ativo} /> Ativo
              </label>
            </Formulario>
            <Formulario acao={excluirConfiguracao} botao={<>Excluir<span className="sr-only"> setor {s.nome}</span></>} classeBotao="text-erro underline" className="mt-2 flex items-center gap-3">
              <input type="hidden" name="orgao" value={slug} />
              <input type="hidden" name="tabela" value="setores" />
              <input type="hidden" name="id" value={s.id} />
            </Formulario>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Novo setor</h2>
      <Formulario acao={salvarConfiguracao} botao="Incluir setor" className="mt-3 max-w-xl space-y-4">
        <input type="hidden" name="orgao" value={slug} />
        <input type="hidden" name="tabela" value="setores" />
        <input type="hidden" name="ativo" value="on" />
        <Campo id="nome" rotulo="Nome" placeholder="Ex.: Procuradoria Jurídica" required />
        <Campo id="sigla" rotulo="Sigla" placeholder="Ex.: PJ" required />
      </Formulario>
    </>
  );
}
