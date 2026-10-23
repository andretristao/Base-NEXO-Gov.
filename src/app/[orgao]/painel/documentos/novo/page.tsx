import type { Metadata } from "next";
import { Campo, CampoSelecao, CampoTexto, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { rotuloCategoria } from "@/lib/protocolo";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { criarDocumento } from "../actions";

export const metadata: Metadata = { title: "Novo documento" };

export default async function NovoDocumento({ params, searchParams }: PageProps<"/[orgao]/painel/documentos/novo">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador", "gestor", "editor"]);
  const { tipo } = await searchParams;
  const { tipos } = await carregarConfiguracao(orgao.id);
  const opcoes = tipos
    .filter((t) => t.ativo)
    .map((t) => ({ valor: t.id, rotulo: `${t.nome} (${t.sigla})`, grupo: rotuloCategoria[t.categoria] }));

  return (
    <>
      <h1 className="text-2xl font-bold">Novo documento</h1>
      <p className="mt-1 text-texto-suave">
        O número de protocolo e o número do documento são gerados ao salvar. O documento entra na primeira etapa do fluxo do tipo.
      </p>
      <Formulario acao={criarDocumento} botao="Protocolar" className="mt-6 max-w-2xl space-y-4">
        <input type="hidden" name="orgao" value={slug} />
        <CampoSelecao id="tipo_id" rotulo="Tipo de documento" opcoes={opcoes} vazio="Escolha o tipo"
          defaultValue={typeof tipo === "string" ? tipo : ""} required />
        <Campo id="assunto" rotulo="Assunto ou ementa" required maxLength={500} />
        <Campo id="interessado" rotulo="Autor ou interessado" ajuda="Ex.: Vereador João da Silva, Mesa Diretora, Associação de Moradores." />
        <CampoTexto id="texto" rotulo="Texto" rows={12} />
      </Formulario>
    </>
  );
}
