import type { Metadata } from "next";
import Link from "next/link";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { FormNoticia } from "../FormNoticia";

export const metadata: Metadata = { title: "Nova notícia" };

export default async function NovaNoticia({ params }: PageProps<"/[orgao]/painel/conteudo/noticias/nova">) {
  const { orgao: slug } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador", "gestor", "editor"]);
  const supabase = await createClient();
  const { data } = await supabase.from("noticias").select("categoria").eq("orgao_id", orgao.id).not("categoria", "is", null).limit(500);

  return (
    <>
      <p><Link href={`/${slug}/painel/conteudo/noticias`}>Notícias</Link></p>
      <h1 className="mt-1 text-2xl font-bold">Nova notícia</h1>
      <FormNoticia slug={slug} categorias={[...new Set((data ?? []).map((d) => d.categoria as string))]} />
    </>
  );
}
