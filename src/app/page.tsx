import Link from "next/link";
import { connection } from "next/server";
import { supabaseConfigurado } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { rotuloTipo, type Orgao } from "@/lib/tipos";

export default async function Inicio() {
  await connection();
  let orgaos: Pick<Orgao, "slug" | "nome" | "tipo" | "municipio" | "uf">[] = [];
  if (supabaseConfigurado()) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("orgaos")
      .select("slug, nome, tipo, municipio, uf")
      .eq("ativo", true)
      .order("nome");
    orgaos = data ?? [];
  }

  return (
    <main id="conteudo" className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
      <h1 className="text-3xl font-bold text-primaria-escura">NEXO Gov</h1>
      <p className="mt-2 text-lg text-texto-suave">
        Diário Oficial, Portal da Transparência, Ouvidoria e e-SIC em uma única plataforma,
        com acessibilidade, LGPD e trilha de auditoria.
      </p>

      <h2 className="mt-10 text-xl font-semibold">Órgãos atendidos</h2>
      {orgaos.length === 0 ? (
        <p className="mt-2 text-texto-suave">
          {supabaseConfigurado()
            ? "Nenhum órgão cadastrado ainda. Rode o seed de demonstração."
            : "Supabase não configurado. Veja o README para as variáveis de ambiente."}
        </p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {orgaos.map((o) => (
            <li key={o.slug} className="rounded border border-borda p-4">
              <Link href={`/${o.slug}`} className="font-semibold">{o.nome}</Link>
              <p className="text-sm text-texto-suave">
                {rotuloTipo[o.tipo]} · {o.municipio}/{o.uf}
              </p>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-10">
        <Link href="/entrar">Acesso restrito para servidores</Link>
      </p>
    </main>
  );
}
