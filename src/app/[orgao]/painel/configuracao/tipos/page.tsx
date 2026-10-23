import type { Metadata } from "next";
import Link from "next/link";
import { Campo, CampoSelecao, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { rotuloCategoria, type CategoriaDocumento } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { excluirConfiguracao, salvarConfiguracao } from "../actions";

export const metadata: Metadata = { title: "Tipos de documento" };

const CATEGORIAS = (Object.entries(rotuloCategoria) as [CategoriaDocumento, string][])
  .map(([valor, rotulo]) => ({ valor, rotulo }));

export default async function Tipos({ params }: PageProps<"/[orgao]/painel/configuracao/tipos">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const { tipos, fluxos } = await carregarConfiguracao(orgao.id);
  const opcoesFluxo = fluxos.map((f) => ({ valor: f.id, rotulo: f.nome }));

  if (fluxos.length === 0) {
    return (
      <>
        <h1 className="text-2xl font-bold">Tipos de documento</h1>
        <p className="mt-4">
          Cada tipo segue um fluxo. <Link href={`/${slug}/painel/configuracao/fluxos`}>Crie um fluxo</Link> ou
          carregue o <Link href={`/${slug}/painel/configuracao`}>modelo padrão</Link> primeiro.
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-2xl font-bold">Tipos de documento</h1>
      <p className="mt-1 text-texto-suave">
        Cada tipo tem numeração própria por ano (ex.: PL nº 3/2026). Tipos públicos aparecem no portal quando concluídos.
      </p>

      <ul className="mt-6 space-y-3">
        {tipos.map((t) => (
          <li key={t.id} className="rounded border border-borda p-4">
            <Formulario acao={salvarConfiguracao} botao="Salvar" className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <input type="hidden" name="orgao" value={slug} />
              <input type="hidden" name="tabela" value="tipos_documento" />
              <input type="hidden" name="id" value={t.id} />
              <Campo id={`nome-${t.id}`} name="nome" rotulo="Nome" defaultValue={t.nome} required />
              <Campo id={`sigla-${t.id}`} name="sigla" rotulo="Sigla" defaultValue={t.sigla} required />
              <CampoSelecao id={`categoria-${t.id}`} name="categoria" rotulo="Categoria" opcoes={CATEGORIAS} defaultValue={t.categoria} />
              <CampoSelecao id={`fluxo-${t.id}`} name="fluxo_id" rotulo="Fluxo" opcoes={opcoesFluxo} defaultValue={t.fluxo_id} />
              <div className="flex gap-4 pb-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="publico" defaultChecked={t.publico} /> Público
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="ativo" defaultChecked={t.ativo} /> Ativo
                </label>
              </div>
            </Formulario>
            <Formulario acao={excluirConfiguracao} botao={<>Excluir<span className="sr-only"> tipo {t.nome}</span></>} classeBotao="text-erro underline" className="mt-2 flex items-center gap-3">
              <input type="hidden" name="orgao" value={slug} />
              <input type="hidden" name="tabela" value="tipos_documento" />
              <input type="hidden" name="id" value={t.id} />
            </Formulario>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 text-xl font-semibold">Novo tipo</h2>
      <Formulario acao={salvarConfiguracao} botao="Incluir tipo" className="mt-3 max-w-xl space-y-4">
        <input type="hidden" name="orgao" value={slug} />
        <input type="hidden" name="tabela" value="tipos_documento" />
        <input type="hidden" name="ativo" value="on" />
        <Campo id="nome" rotulo="Nome" placeholder="Ex.: Projeto de Emenda à Lei Orgânica" required />
        <Campo id="sigla" rotulo="Sigla" placeholder="Ex.: PELO" required />
        <CampoSelecao id="categoria" rotulo="Categoria" opcoes={CATEGORIAS} defaultValue="proposicao" />
        <CampoSelecao id="fluxo_id" rotulo="Fluxo" opcoes={opcoesFluxo} />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="publico" defaultChecked /> Publicar no portal quando concluído
        </label>
      </Formulario>
    </>
  );
}
