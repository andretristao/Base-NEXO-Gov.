import type { Metadata } from "next";
import Link from "next/link";
import { Icone } from "@/components/Icone";
import { situacaoBanner, urlImagem, type Banner } from "@/lib/conteudo";
import { exigirAcessoOrgao } from "@/lib/dal";
import { formatarData } from "@/lib/protocolo";
import { createClient } from "@/lib/supabase/server";
import { FormBanner } from "./FormBanner";

export const metadata: Metadata = { title: "Banners" };

export default async function Banners({ params }: PageProps<"/[orgao]/painel/conteudo/banners">) {
  const { orgao: slug } = await params;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("banners").select("*").eq("orgao_id", orgao.id).order("ordem").order("criado_em");
  const banners = (data ?? []) as Banner[];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Banners da página inicial</h1>
        <Link href={`/${slug}`}>Ver no portal</Link>
      </div>
      <p className="mt-1 text-texto-suave">
        O primeiro banner no ar aparece grande no topo da página inicial; os dois seguintes, ao lado.
      </p>

      {banners.length ? (
        <ol className="mt-6 divide-y divide-borda rounded border border-borda bg-fundo">
          {banners.map((b) => {
            const img = urlImagem(b.imagem_caminho);
            const sit = situacaoBanner(b);
            return (
              <li key={b.id} className="flex items-center gap-4 p-3">
                <span className="w-8 text-center font-semibold text-texto-suave" title="Ordem">{b.ordem}</span>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={img} alt="" className="h-14 w-24 shrink-0 rounded object-cover" />
                ) : (
                  <span className="faixa-orgao flex h-14 w-24 shrink-0 items-center justify-center rounded bg-orgao text-white">
                    <Icone nome="quadro" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <Link href={`/${slug}/painel/conteudo/banners/${b.id}`} className="font-semibold">{b.titulo}</Link>
                  <p className="truncate text-sm text-texto-suave">
                    {b.link_url ?? "sem link"}
                    {(b.inicio_em || b.fim_em) && ` · ${b.inicio_em ? formatarData(b.inicio_em) : "…"} a ${b.fim_em ? formatarData(b.fim_em) : "…"}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                  sit === "No ar" ? "border-sucesso text-sucesso" : "border-borda text-texto-suave"
                }`}>{sit}</span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mt-6 rounded border border-dashed border-borda p-6 text-center text-texto-suave">
          Nenhum banner. Sem banners, a página inicial começa pelos serviços.
        </p>
      )}

      {papel !== "consulta" && (
        <section aria-labelledby="titulo-novo" className="mt-10">
          <h2 id="titulo-novo" className="text-xl font-semibold">Novo banner</h2>
          <FormBanner slug={slug} proximaOrdem={banners.length ? Math.max(...banners.map((b) => b.ordem)) + 1 : 0} />
        </section>
      )}
    </>
  );
}
