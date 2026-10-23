import Link from "next/link";
import { BarraAcessibilidade } from "@/components/BarraAcessibilidade";
import { Icone } from "@/components/Icone";
import { exigirAcessoOrgao, podeAdministrar } from "@/lib/dal";
import { rotuloPapel } from "@/lib/tipos";
import { BuscaPainel } from "./BuscaPainel";
import { MenuPainel, type GrupoMenu, type ItemMenu } from "./MenuPainel";

export default async function LayoutPainel({ children, params }: LayoutProps<"/[orgao]/painel">) {
  const { orgao: slug } = await params;
  const { usuario, papel, orgao } = await exigirAcessoOrgao(slug);
  const base = `/${slug}/painel`;
  const camara = orgao.tipo === "camara";

  const grupos: GrupoMenu[] = [
    {
      itens: [
        { href: base, rotulo: "Resumo", icone: "inicio" },
        { href: `${base}/documentos`, rotulo: "Documentos", icone: "documento" },
        { href: `${base}/documentos/quadro`, rotulo: "Quadro de tramitação", icone: "quadro" },
        ...(camara ? [{ href: `${base}/sessoes`, rotulo: "Sessões", icone: "sessao" } as const] : []),
      ],
    },
    {
      titulo: "Conteúdo do portal",
      itens: [
        { href: `${base}/conteudo/noticias`, rotulo: "Notícias", icone: "diario" },
        { href: `${base}/conteudo/banners`, rotulo: "Banners", icone: "imagem" },
        { href: `${base}/conteudo/atalhos`, rotulo: "Mais buscados", icone: "estrela" },
      ],
    },
    ...(podeAdministrar(papel)
      ? [{
          titulo: "Administração",
          itens: [
            { href: `${base}/configuracao`, rotulo: "Configurar protocolo", icone: "configuracao" },
            { href: `${base}/orgao`, rotulo: "Dados do órgão", icone: "predio" },
            { href: `${base}/usuarios`, rotulo: "Usuários e perfis", icone: "usuarios" },
            { href: `${base}/auditoria`, rotulo: "Auditoria", icone: "auditoria" },
          ] satisfies ItemMenu[],
        }]
      : []),
    {
      titulo: "Conta",
      itens: [
        { href: "/conta/seguranca", rotulo: "Segurança e 2FA", icone: "cadeado" },
        { href: "/painel", rotulo: "Trocar de órgão", icone: "movimento" },
      ],
    },
  ];

  const atalhos: ItemMenu[] = [
    ...grupos.flatMap((g) => g.itens),
    ...(papel !== "consulta"
      ? [
          { href: `${base}/documentos/novo`, rotulo: "Novo documento", icone: "mais" } as const,
          { href: `${base}/conteudo/noticias/nova`, rotulo: "Nova notícia", icone: "mais" } as const,
          ...(camara ? [{ href: `${base}/sessoes#agendar`, rotulo: "Agendar sessão", icone: "mais" } as const] : []),
        ]
      : []),
    { href: `/${slug}`, rotulo: "Ver portal público", icone: "olho" },
  ];

  return (
    <>
      <BarraAcessibilidade linkAcessibilidade={`/${slug}/acessibilidade`} />

      <header className="faixa-escura border-b border-transparent bg-[#1d2327] text-sm text-white">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-2">
          <Link href={base} className="flex items-center gap-2 font-bold no-underline hover:underline">
            <Icone nome="predio" />
            {orgao.nome_curto || orgao.nome}
          </Link>
          <Link href={`/${slug}`} className="flex items-center gap-1.5">
            <Icone nome="olho" className="h-4 w-4" />
            Ver portal
          </Link>
          <BuscaPainel slug={slug} atalhos={atalhos} />
          <p className="ml-auto">
            {usuario.nome}
            <span className="text-white/80"> · {papel === "superadmin" ? "Equipe NEXO" : rotuloPapel[papel]}</span>
          </p>
          <form action="/sair" method="post">
            <button type="submit" className="flex items-center gap-1.5 underline">
              <Icone nome="sair" className="h-4 w-4" />
              Sair
            </button>
          </form>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <nav id="menu" aria-label="Área restrita" className="faixa-escura bg-[#2c3338] text-white md:w-60 md:shrink-0">
          <MenuPainel grupos={grupos} />
        </nav>
        <div className="flex min-w-0 flex-1 flex-col bg-fundo-suave">
          <main id="conteudo" tabIndex={-1} className="w-full max-w-6xl flex-1 px-4 py-6 md:px-8">
            {children}
          </main>
          <footer id="rodape" className="border-t border-borda px-4 py-3 text-sm text-texto-suave md:px-8">
            Plataforma NEXO Gov · Área restrita da {orgao.nome}. Ações ficam registradas na trilha de auditoria.
          </footer>
        </div>
      </div>
    </>
  );
}
