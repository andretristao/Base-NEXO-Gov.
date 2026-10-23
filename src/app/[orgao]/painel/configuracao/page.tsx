import type { Metadata } from "next";
import Link from "next/link";
import { Formulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { carregarConfiguracao } from "@/lib/protocolo-dados";
import { carregarModeloPadrao } from "./actions";

export const metadata: Metadata = { title: "Configuração do protocolo" };

export default async function Configuracao({ params }: PageProps<"/[orgao]/painel/configuracao">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const config = await carregarConfiguracao(orgao.id);
  const base = `/${slug}/painel/configuracao`;

  const resumo = [
    { href: `${base}/setores`, rotulo: "Setores", total: config.setores.length, texto: "Unidades que recebem documentos (Protocolo, Secretaria, Jurídico…)." },
    { href: `${base}/fluxos`, rotulo: "Fluxos e etapas", total: config.fluxos.length, texto: "Caminho de cada documento e o status de cada etapa." },
    { href: `${base}/tipos`, rotulo: "Tipos de documento", total: config.tipos.length, texto: "Ofício, projeto de lei, requerimento, ata… com numeração própria." },
    { href: `${base}/fases`, rotulo: "Fases da sessão", total: config.fases.length, texto: "Partes da pauta: Expediente, Tribuna Livre, Ordem do Dia…" },
  ];

  return (
    <>
      <h1 className="text-2xl font-bold">Configuração do protocolo</h1>
      <p className="mt-1 text-texto-suave">
        Tudo aqui pode ser alterado a qualquer momento, e cada alteração fica na trilha de auditoria.
      </p>

      {config.tipos.length === 0 && (
        <div className="mt-6 rounded border border-borda bg-fundo-suave p-5">
          <h2 className="text-lg font-semibold">Começar com o modelo padrão</h2>
          <p className="mt-1">
            {orgao.tipo === "camara"
              ? "Cria setores, os fluxos Administrativo, Legislativo e Atas, os tipos (ofício, projeto de lei, decreto, requerimento, indicação, moção, ata) e as fases da sessão."
              : "Cria setores, o fluxo Administrativo e os tipos ofício, memorando, decreto e portaria."}
          </p>
          <Formulario acao={carregarModeloPadrao} botao="Carregar modelo padrão" className="mt-4 space-y-3">
            <input type="hidden" name="orgao" value={slug} />
          </Formulario>
        </div>
      )}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {resumo.map((r) => (
          <li key={r.href} className="rounded border border-borda p-5">
            <h2 className="text-lg font-semibold"><Link href={r.href}>{r.rotulo}</Link></h2>
            <p className="text-2xl font-bold">{r.total}</p>
            <p className="text-texto-suave">{r.texto}</p>
          </li>
        ))}
      </ul>
    </>
  );
}
