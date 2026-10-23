import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { VLibras } from "@/components/VLibras";
import { exigirOrgao, getOrgaoPorSlug } from "@/lib/dal";

export async function generateMetadata({ params }: LayoutProps<"/[orgao]">): Promise<Metadata> {
  const { orgao } = await params;
  const dados = await getOrgaoPorSlug(orgao);
  return dados ? { title: { default: dados.nome, template: `%s · ${dados.nome}` } } : {};
}

// Moldura comum ao portal público, (portal)/layout.tsx, e à área restrita, painel/layout.tsx.
export default async function LayoutOrgao({ children, params }: LayoutProps<"/[orgao]">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);

  return (
    <div className="tema-orgao flex flex-1 flex-col" style={{ "--cor-orgao": orgao.cor_primaria } as CSSProperties}>
      {children}
      <VLibras />
    </div>
  );
}
