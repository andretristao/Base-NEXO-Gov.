import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/components/Formulario";
import { situacaoNoticia, type Noticia } from "@/lib/conteudo";
import { exigirAcessoOrgao } from "@/lib/dal";
import { formatarDataHora } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";
import { excluirNoticia } from "../../actions";
import { FormNoticia } from "../FormNoticia";

export const metadata: Metadata = { title: "Editar notícia" };

export default async function EditarNoticia({ params, searchParams }: PageProps<"/[orgao]/painel/conteudo/noticias/[id]">) {
  const { orgao: slug, id } = await params;
  const { salvo } = await searchParams;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const supabase = await createClient();
  const [{ data }, { data: cats }] = await Promise.all([
    supabase.from("noticias").select("*").eq("id", id).eq("orgao_id", orgao.id).maybeSingle(),
    supabase.from("noticias").select("categoria").eq("orgao_id", orgao.id).not("categoria", "is", null).limit(500),
  ]);
  if (!data) notFound();
  const noticia = data as Noticia;
  const situacao = situacaoNoticia(noticia);
  const podeEditar = papel !== "consulta";

  return (
    <>
      <p><Link href={`/${slug}/painel/conteudo/noticias`}>Notícias</Link></p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{podeEditar ? "Editar notícia" : noticia.titulo}</h1>
        {situacao === "Publicada" && <Link href={`/${slug}/noticias/${noticia.id}`}>Ver no portal</Link>}
      </div>
      <p className="text-texto-suave">
        {situacao}
        {noticia.publicado_em && ` · ${situacao === "Agendada" ? "sai em" : "publicada em"} ${formatarDataHora(noticia.publicado_em)}`}
        {` · última alteração ${formatarDataHora(noticia.atualizado_em)}`}
      </p>
      {salvo === "1" && <p role="status" className="mt-3 font-semibold text-sucesso">Notícia criada.</p>}

      {podeEditar ? (
        <>
          <FormNoticia slug={slug} noticia={noticia} categorias={[...new Set((cats ?? []).map((c) => c.categoria as string))]} />
          <details className="mt-10 max-w-xl rounded border border-erro p-4">
            <summary className="cursor-pointer font-semibold text-erro">Excluir notícia</summary>
            <Formulario acao={excluirNoticia} botao="Excluir definitivamente" className="mt-3 space-y-3"
              classeBotao="rounded border border-erro px-4 py-2 font-semibold text-erro">
              <input type="hidden" name="orgao" value={slug} />
              <input type="hidden" name="id" value={noticia.id} />
              <label className="flex items-center gap-2">
                <input type="checkbox" name="confirmar" className="h-4 w-4" />
                Confirmo que quero excluir esta notícia e a imagem dela.
              </label>
            </Formulario>
          </details>
        </>
      ) : (
        <div className="mt-6 space-y-3 rounded border border-borda bg-fundo p-5">
          {noticia.resumo && <p className="font-semibold">{noticia.resumo}</p>}
          <p className="whitespace-pre-line">{noticia.corpo}</p>
        </div>
      )}
    </>
  );
}
