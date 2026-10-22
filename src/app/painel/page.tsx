import type { Metadata } from "next";
import Link from "next/link";
import { PaginaSimples } from "@/components/PaginaSimples";
import { exigirUsuario } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { rotuloPapel, type Papel } from "@/lib/tipos";

export const metadata: Metadata = { title: "Meus órgãos" };

type Linha = { slug: string; nome: string; papel: Papel | "superadmin" };

export default async function MeusOrgaos() {
  const usuario = await exigirUsuario("/painel");
  const supabase = await createClient();

  let linhas: Linha[];
  if (usuario.superadmin) {
    const { data } = await supabase.from("orgaos").select("slug, nome").order("nome");
    linhas = (data ?? []).map((o) => ({ ...o, papel: "superadmin" as const }));
  } else {
    const { data } = await supabase
      .from("membros")
      .select("papel, orgaos!inner(slug, nome)")
      .eq("usuario_id", usuario.id)
      .eq("ativo", true);
    linhas = (data ?? []).map((m) => {
      const o = m.orgaos as unknown as { slug: string; nome: string };
      return { slug: o.slug, nome: o.nome, papel: m.papel as Papel };
    });
  }

  return (
    <PaginaSimples titulo="Meus órgãos" largura="max-w-3xl">
      <p>Conectado como {usuario.nome} ({usuario.email}).</p>
      {linhas.length === 0 ? (
        <p className="mt-4">Sua conta ainda não está vinculada a nenhum órgão. Fale com o administrador.</p>
      ) : (
        <ul className="mt-6 divide-y divide-borda rounded border border-borda">
          {linhas.map((l) => (
            <li key={l.slug} className="flex items-center justify-between p-4">
              <Link href={`/${l.slug}/painel`} className="font-semibold">{l.nome}</Link>
              <span className="text-sm text-texto-suave">
                {l.papel === "superadmin" ? "Equipe NEXO" : rotuloPapel[l.papel]}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-8 flex gap-6">
        <Link href="/conta/seguranca">Segurança da conta</Link>
        <form action="/sair" method="post"><button type="submit" className="underline">Sair</button></form>
      </div>
    </PaginaSimples>
  );
}
