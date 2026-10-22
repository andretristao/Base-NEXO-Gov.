import Link from "next/link";
import type { ReactNode } from "react";
import { BarraAcessibilidade } from "@/components/BarraAcessibilidade";

// Moldura das páginas fora de um órgão (login, conta, lista de órgãos).
export function PaginaSimples({ titulo, children, largura = "max-w-md" }: {
  titulo: string;
  children: ReactNode;
  largura?: string;
}) {
  return (
    <>
      <BarraAcessibilidade linkAcessibilidade="/" />
      <header className="bg-primaria-escura text-white">
        <nav id="menu" aria-label="Menu principal" className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold text-white no-underline">NEXO Gov</Link>
          <Link href="/painel" className="text-white">Meus órgãos</Link>
        </nav>
      </header>
      <main id="conteudo" tabIndex={-1} className={`mx-auto w-full ${largura} flex-1 px-4 py-10`}>
        <h1 className="text-2xl font-bold">{titulo}</h1>
        <div className="mt-6">{children}</div>
      </main>
      <footer id="rodape" className="border-t border-borda bg-fundo-suave px-4 py-6 text-center text-sm">
        Plataforma NEXO Gov
      </footer>
    </>
  );
}
