import Link from "next/link";
import { exigirAcessoOrgao } from "@/lib/dal";

export default async function LayoutConfiguracao({ children, params }: LayoutProps<"/[orgao]/painel/configuracao">) {
  const { orgao: slug } = await params;
  await exigirAcessoOrgao(slug, ["administrador"]);
  const base = `/${slug}/painel/configuracao`;
  const abas = [
    { href: base, rotulo: "Visão geral" },
    { href: `${base}/setores`, rotulo: "Setores" },
    { href: `${base}/fluxos`, rotulo: "Fluxos e etapas" },
    { href: `${base}/tipos`, rotulo: "Tipos de documento" },
    { href: `${base}/fases`, rotulo: "Fases da sessão" },
  ];

  return (
    <>
      <nav aria-label="Configuração do protocolo" className="mb-6 border-b border-borda pb-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-1">
          {abas.map((a) => <li key={a.href}><Link href={a.href}>{a.rotulo}</Link></li>)}
        </ul>
      </nav>
      {children}
    </>
  );
}
