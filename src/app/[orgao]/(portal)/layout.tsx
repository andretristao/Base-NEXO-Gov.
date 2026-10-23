import Link from "next/link";
import { BarraAcessibilidade } from "@/components/BarraAcessibilidade";
import { Icone } from "@/components/Icone";
import { carregarAtalhos } from "@/lib/conteudo-dados";
import { exigirOrgao } from "@/lib/dal";
import { servicosDoOrgao } from "@/lib/portal";
import { formatarCnpj } from "@/lib/tipos";

export default async function LayoutPortal({ children, params }: LayoutProps<"/[orgao]">) {
  const { orgao: slug } = await params;
  const orgao = await exigirOrgao(slug);
  const base = `/${orgao.slug}`;
  const servicos = servicosDoOrgao(orgao);
  const disponiveis = servicos.filter((s) => s.disponivel);

  const menu = [
    { href: base, rotulo: "Início" },
    { href: `${base}/noticias`, rotulo: "Notícias" },
    ...disponiveis.map((s) => ({ href: `${base}/${s.caminho}`, rotulo: s.titulo })),
  ];
  // Atalhos cadastrados no painel; sem nenhum, os três primeiros serviços.
  const atalhos = await carregarAtalhos(orgao.id);
  const maisBuscados = atalhos.length
    ? atalhos.map((a) => ({ chave: a.id, href: a.url, rotulo: a.rotulo }))
    : disponiveis.slice(0, 3).map((s) => ({ chave: s.caminho, href: `${base}/${s.caminho}`, rotulo: s.titulo }));

  return (
    <>
      <BarraAcessibilidade linkAcessibilidade={`${base}/acessibilidade`} />

      <header className="border-b border-borda bg-fundo">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-8 gap-y-4 px-4 py-5">
          <Link href={base} className="flex items-center gap-3 text-texto no-underline">
            {orgao.brasao_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={orgao.brasao_url} alt="" width={64} height={64} className="h-16 w-16 object-contain" />
            ) : (
              <span className="faixa-orgao flex h-14 w-14 items-center justify-center rounded-full bg-orgao text-white">
                <Icone nome="predio" className="h-8 w-8" />
              </span>
            )}
            <span>
              <span className="block text-xl font-bold leading-tight sm:text-2xl">{orgao.nome}</span>
              <span className="block text-sm text-texto-suave">{orgao.municipio} · {orgao.uf}</span>
            </span>
          </Link>

          <div className="w-full lg:w-[30rem]">
            <form role="search" action={`${base}/busca`} className="flex">
              <label htmlFor="busca" className="sr-only">O que você procura?</label>
              <input
                id="busca"
                name="q"
                type="search"
                placeholder="O que você procura?"
                className="min-w-0 flex-1 rounded-l-full border border-r-0 border-borda bg-fundo px-5 py-2.5 text-texto"
              />
              <button type="submit" className="faixa-orgao flex items-center gap-2 rounded-r-full bg-orgao px-5 font-semibold text-white">
                <Icone nome="busca" />
                <span className="sr-only sm:not-sr-only">Buscar</span>
              </button>
            </form>
            {maisBuscados.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-texto-suave">Mais buscados:</span>
                {maisBuscados.map((a) => (
                  <Link key={a.chave} href={a.href}
                    className="rounded-full border border-borda px-3 py-0.5 text-texto no-underline hover:border-orgao hover:text-orgao">
                    {a.rotulo}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <nav id="menu" aria-label="Menu principal" className="faixa-orgao bg-orgao">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 px-4">
            <ul className="flex flex-wrap gap-x-1">
              {menu.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="block px-3 py-3 font-semibold text-white no-underline hover:bg-black/20 hover:underline">
                    {item.rotulo}
                  </Link>
                </li>
              ))}
            </ul>
            <Link href={`${base}/painel`} className="flex items-center gap-2 py-3 text-sm text-white">
              <Icone nome="cadeado" className="h-4 w-4" />
              Acesso restrito
            </Link>
          </div>
        </nav>
      </header>

      <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>

      <footer id="rodape" className="faixa-escura mt-8 bg-[#1b1b1b] text-sm text-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-base font-bold">{orgao.nome}</p>
            {orgao.cnpj && <p className="mt-1">CNPJ {formatarCnpj(orgao.cnpj)}</p>}
            {orgao.endereco && (
              <p className="mt-3 flex gap-2"><Icone nome="local" className="mt-0.5 h-4 w-4" />{orgao.endereco}</p>
            )}
            {orgao.telefone && (
              <p className="mt-1 flex gap-2"><Icone nome="telefone" className="mt-0.5 h-4 w-4" />{orgao.telefone}</p>
            )}
            {orgao.email_contato && (
              <p className="mt-1 flex gap-2">
                <Icone nome="email" className="mt-0.5 h-4 w-4" />
                <a href={`mailto:${orgao.email_contato}`}>{orgao.email_contato}</a>
              </p>
            )}
          </div>
          <nav aria-label="Serviços">
            <p className="text-base font-bold">Serviços</p>
            <ul className="mt-2 space-y-1">
              {disponiveis.map((s) => (
                <li key={s.caminho}><Link href={`${base}/${s.caminho}`}>{s.titulo}</Link></li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-base font-bold">Proteção de dados (LGPD)</p>
            <p className="mt-2">Encarregado: {orgao.encarregado_nome ?? "a definir"}</p>
            {orgao.encarregado_email && (
              <p><a href={`mailto:${orgao.encarregado_email}`}>{orgao.encarregado_email}</a></p>
            )}
            <p className="mt-1"><Link href={`${base}/privacidade`}>Política de privacidade</Link></p>
          </div>
          <nav aria-label="Institucional">
            <p className="text-base font-bold">Institucional</p>
            <ul className="mt-2 space-y-1">
              <li><Link href={`${base}/acessibilidade`}>Acessibilidade</Link></li>
              <li><Link href={`${base}/painel`}>Acesso restrito</Link></li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-white/20">
          <p className="mx-auto max-w-6xl px-4 py-4 text-white/80">Plataforma NEXO Gov</p>
        </div>
      </footer>
    </>
  );
}
