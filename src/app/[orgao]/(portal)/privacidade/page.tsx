import type { Metadata } from "next";
import { exigirOrgao } from "@/lib/dal";
import { formatarCnpj } from "@/lib/tipos";

export const metadata: Metadata = { title: "Política de privacidade" };

export default async function Privacidade({ params }: PageProps<"/[orgao]/privacidade">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);

  return (
    <article className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Política de privacidade</h1>
      <p>
        {orgao.nome}
        {orgao.cnpj ? ` (CNPJ ${formatarCnpj(orgao.cnpj)})` : ""} é o controlador dos dados pessoais
        tratados neste portal, nos termos da Lei Geral de Proteção de Dados Pessoais (Lei 13.709/2018).
      </p>
      <h2 className="text-xl font-semibold">Quais dados tratamos</h2>
      <p>
        Na navegação pública, apenas dados técnicos mínimos (endereço IP e navegador) para segurança.
        Nos serviços de Ouvidoria e e-SIC, os dados que você informar no formulário, usados apenas
        para responder à sua manifestação ou pedido.
      </p>
      <h2 className="text-xl font-semibold">Base legal</h2>
      <p>
        Cumprimento de obrigação legal e execução de políticas públicas (art. 7º, II e III, e art. 23
        da LGPD), além da Lei de Acesso à Informação (Lei 12.527/2011) e do Código de Defesa do
        Usuário do Serviço Público (Lei 13.460/2017).
      </p>
      <h2 className="text-xl font-semibold">Armazenamento e segurança</h2>
      <p>
        Os dados ficam em servidores no Brasil, com acesso restrito por perfil, autenticação em dois
        fatores para servidores e trilha de auditoria de todas as alterações.
      </p>
      <h2 className="text-xl font-semibold">Seus direitos</h2>
      <p>
        Você pode pedir confirmação, acesso, correção, anonimização ou eliminação dos seus dados
        (art. 18 da LGPD) ao encarregado:
        {" "}{orgao.encarregado_nome ?? "a definir"}
        {orgao.encarregado_email ? <> · <a href={`mailto:${orgao.encarregado_email}`}>{orgao.encarregado_email}</a></> : null}.
      </p>
    </article>
  );
}
