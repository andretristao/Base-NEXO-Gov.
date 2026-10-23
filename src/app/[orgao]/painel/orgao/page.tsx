import type { Metadata } from "next";
import { Campo, Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { formatarCnpj, rotuloTipo } from "@/lib/tipos";
import { salvarOrgao } from "./actions";

export const metadata: Metadata = { title: "Dados do órgão" };

export default async function DadosOrgao({ params }: PageProps<"/[orgao]/painel/orgao">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);

  return (
    <>
      <h1 className="text-2xl font-bold">Dados do órgão</h1>
      <p className="mt-1 text-texto-suave">
        {rotuloTipo[orgao.tipo]} · CNPJ {formatarCnpj(orgao.cnpj) ?? "não informado"} · endereço /{orgao.slug}
      </p>
      <Formulario acao={salvarOrgao} botao="Salvar" className="mt-6 max-w-xl space-y-4">
        <input type="hidden" name="orgao" value={slug} />
        <Campo id="nome" rotulo="Nome oficial" defaultValue={orgao.nome} required />
        <Campo id="nome_curto" rotulo="Nome curto" defaultValue={orgao.nome_curto ?? ""} />
        <Campo id="endereco" rotulo="Endereço" defaultValue={orgao.endereco ?? ""} />
        <Campo id="telefone" rotulo="Telefone" defaultValue={orgao.telefone ?? ""} />
        <Campo id="email_contato" rotulo="E-mail de contato" type="email" defaultValue={orgao.email_contato ?? ""} />
        <fieldset className="space-y-4 rounded border border-borda p-4">
          <legend className="px-1 font-semibold">Encarregado de dados (LGPD)</legend>
          <Campo id="encarregado_nome" rotulo="Nome" defaultValue={orgao.encarregado_nome ?? ""} />
          <Campo id="encarregado_email" rotulo="E-mail" type="email" defaultValue={orgao.encarregado_email ?? ""} />
        </fieldset>
        <fieldset className="space-y-3 rounded border border-borda p-4">
          <legend className="px-1 font-semibold">Brasão</legend>
          {orgao.brasao_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={orgao.brasao_url} alt="Brasão atual" className="h-20 w-20 object-contain" />
          )}
          <div>
            <label htmlFor="brasao_arquivo" className="block font-semibold">Enviar imagem do brasão</label>
            <p id="brasao_arquivo-ajuda" className="text-sm text-texto-suave">PNG com fundo transparente, até 2 MB.</p>
            <input id="brasao_arquivo" name="brasao_arquivo" type="file" accept="image/png,image/jpeg,image/webp"
              aria-describedby="brasao_arquivo-ajuda" className="mt-1 w-full text-sm" />
          </div>
          <Campo id="brasao_url" rotulo="Ou endereço da imagem" type="url" defaultValue={orgao.brasao_url ?? ""}
            ajuda="Deixe em branco para remover o brasão." />
        </fieldset>
        <Campo
          id="cor_primaria"
          rotulo="Cor principal"
          ajuda="Use uma cor escura: o texto do cabeçalho é branco."
          type="color"
          defaultValue={orgao.cor_primaria}
        />
      </Formulario>
    </>
  );
}
