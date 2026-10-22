import Link from "next/link";
import { exigirAcessoOrgao, podeAdministrar } from "@/lib/dal";
import { rotuloPapel } from "@/lib/tipos";

export default async function LayoutPainel({ children, params }: LayoutProps<"/[orgao]/painel">) {
  const { orgao: slug } = await params;
  const { usuario, papel } = await exigirAcessoOrgao(slug);
  const base = `/${slug}/painel`;

  const itens = [
    { href: base, rotulo: "Resumo" },
    ...(podeAdministrar(papel)
      ? [
          { href: `${base}/orgao`, rotulo: "Dados do órgão" },
          { href: `${base}/usuarios`, rotulo: "Usuários e perfis" },
          { href: `${base}/auditoria`, rotulo: "Auditoria" },
        ]
      : []),
  ];

  return (
    <div className="grid gap-8 md:grid-cols-[14rem_1fr]">
      <aside>
        <p className="text-sm text-texto-suave">
          {usuario.nome} · {papel === "superadmin" ? "Equipe NEXO" : rotuloPapel[papel]}
        </p>
        <nav aria-label="Área restrita" className="mt-3">
          <ul className="space-y-1">
            {itens.map((i) => (
              <li key={i.href}><Link href={i.href}>{i.rotulo}</Link></li>
            ))}
            <li className="pt-3"><Link href="/painel">Trocar de órgão</Link></li>
            <li>
              <form action="/sair" method="post"><button type="submit" className="underline">Sair</button></form>
            </li>
          </ul>
        </nav>
      </aside>
      <section aria-label="Conteúdo da área restrita">{children}</section>
    </div>
  );
}
