import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { BarraAcessibilidade } from "@/components/BarraAcessibilidade";
import { VLibras } from "@/components/VLibras";
import { exigirOrgao, getOrgaoPorSlug } from "@/lib/dal";
import { formatarCnpj } from "@/lib/tipos";

export async function generateMetadata({ params }: LayoutProps<"/[orgao]">): Promise<Metadata> {
  const { orgao } = await params;
  const dados = await getOrgaoPorSlug(orgao);
  return dados ? { title: { default: dados.nome, template: `%s · ${dados.nome}` } } : {};
}

export default async function LayoutOrgao({ children, params }: LayoutProps<"/[orgao]">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);
  const base = `/${orgao.slug}`;

  const menu = [
    { href: base, rotulo: "Início" },
    { href: `${base}/diario-oficial`, rotulo: "Diário Oficial" },
    { href: `${base}/transparencia`, rotulo: "Transparência" },
    { href: `${base}/ouvidoria`, rotulo: "Ouvidoria" },
    { href: `${base}/e-sic`, rotulo: "e-SIC" },
  ];

  return (
    <div className="flex flex-1 flex-col" style={{ "--cor-orgao": orgao.cor_primaria } as CSSProperties}>
      <BarraAcessibilidade linkAcessibilidade={`${base}/acessibilidade`} />

      <header className="faixa-orgao bg-orgao text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5">
          <Link href={base} className="flex items-center gap-3 text-white no-underline">
            {orgao.brasao_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={orgao.brasao_url} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
            )}
            <span>
              <span className="block text-xl font-bold leading-tight">{orgao.nome}</span>
              <span className="block text-sm">{orgao.municipio} · {orgao.uf}</span>
            </span>
          </Link>
          <form role="search" action={`${base}/busca`} className="flex gap-2">
            <label htmlFor="busca" className="sr-only">Buscar no portal</label>
            <input
              id="busca"
              name="q"
              type="search"
              placeholder="Buscar no portal"
              className="rounded border border-white bg-fundo px-3 py-1.5 text-texto"
            />
            <button type="submit" className="rounded border border-white px-3 py-1.5 text-white">Buscar</button>
          </form>
        </div>
        <nav id="menu" aria-label="Menu principal" className="bg-black/20">
          <ul className="mx-auto flex max-w-6xl flex-wrap gap-x-6 gap-y-1 px-4 py-2">
            {menu.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-white">{item.rotulo}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer id="rodape" className="border-t border-borda bg-fundo-suave text-sm">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3">
          <div>
            <p className="font-semibold">{orgao.nome}</p>
            {orgao.cnpj && <p>CNPJ {formatarCnpj(orgao.cnpj)}</p>}
            {orgao.endereco && <p>{orgao.endereco}</p>}
            {orgao.telefone && <p>Telefone: {orgao.telefone}</p>}
            {orgao.email_contato && <p>E-mail: <a href={`mailto:${orgao.email_contato}`}>{orgao.email_contato}</a></p>}
          </div>
          <div>
            <p className="font-semibold">Proteção de dados (LGPD)</p>
            <p>Encarregado: {orgao.encarregado_nome ?? "a definir"}</p>
            {orgao.encarregado_email && (
              <p><a href={`mailto:${orgao.encarregado_email}`}>{orgao.encarregado_email}</a></p>
            )}
            <p><Link href={`${base}/privacidade`}>Política de privacidade</Link></p>
          </div>
          <div>
            <p><Link href={`${base}/acessibilidade`}>Acessibilidade</Link></p>
            <p><Link href={`${base}/painel`}>Acesso restrito</Link></p>
            <p className="mt-2 text-texto-suave">Plataforma NEXO Gov</p>
          </div>
        </div>
      </footer>

      <VLibras />
    </div>
  );
}
