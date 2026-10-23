import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/components/Formulario";
import { situacaoBanner, type Banner } from "@/lib/conteudo";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { excluirBanner } from "../../actions";
import { FormBanner } from "../FormBanner";

export const metadata: Metadata = { title: "Editar banner" };

export default async function EditarBanner({ params }: PageProps<"/[orgao]/painel/conteudo/banners/[id]">) {
  const { orgao: slug, id } = await params;
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador", "gestor", "editor"]);
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("*").eq("id", id).eq("orgao_id", orgao.id).maybeSingle();
  if (!data) notFound();
  const banner = data as Banner;

  return (
    <>
      <p><Link href={`/${slug}/painel/conteudo/banners`}>Banners</Link></p>
      <h1 className="mt-1 text-2xl font-bold">Editar banner</h1>
      <p className="text-texto-suave">{situacaoBanner(banner)}</p>
      <FormBanner slug={slug} banner={banner} />
      <details className="mt-10 max-w-xl rounded border border-erro p-4">
        <summary className="cursor-pointer font-semibold text-erro">Excluir banner</summary>
        <Formulario acao={excluirBanner} botao="Excluir definitivamente" className="mt-3 space-y-3"
          classeBotao="rounded border border-erro px-4 py-2 font-semibold text-erro">
          <input type="hidden" name="orgao" value={slug} />
          <input type="hidden" name="id" value={banner.id} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="confirmar" className="h-4 w-4" />
            Confirmo que quero excluir este banner e a imagem dele.
          </label>
        </Formulario>
      </details>
    </>
  );
}
