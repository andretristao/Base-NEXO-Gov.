"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone, type NomeIcone } from "@/components/Icone";

export type ItemMenu = { href: string; rotulo: string; icone: NomeIcone };
export type GrupoMenu = { titulo?: string; itens: ItemMenu[] };

// Menu lateral da área restrita, no estilo do wp-admin. Marca a página atual
// pelo item de caminho mais longo que casa com o endereço.
export function MenuPainel({ grupos }: { grupos: GrupoMenu[] }) {
  const caminho = usePathname();
  const todos = grupos.flatMap((g) => g.itens);
  const atual = todos
    .filter((i) => caminho === i.href || caminho.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <div className="flex overflow-x-auto md:block md:space-y-4 md:py-3">
      {grupos.map((grupo, n) => (
        <div key={grupo.titulo ?? n}>
          {grupo.titulo && (
            <p className="hidden px-4 pb-1 text-xs md:block font-semibold uppercase tracking-wide text-white/80">{grupo.titulo}</p>
          )}
          <ul className="flex md:block">
            {grupo.itens.map((i) => {
              const ativo = i.href === atual;
              return (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    aria-current={ativo ? "page" : undefined}
                    className={`flex items-center gap-3 whitespace-nowrap border-b-4 px-4 py-3 no-underline md:border-b-0 md:border-l-4 md:py-2 hover:bg-white/10 hover:underline ${
                      ativo ? "faixa-orgao border-white bg-orgao font-semibold" : "border-transparent"
                    }`}
                  >
                    <Icone nome={i.icone} />
                    {i.rotulo}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
