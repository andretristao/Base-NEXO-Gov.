import type { Metadata } from "next";
import Link from "next/link";
import { Campo, Formulario } from "@/components/Formulario";
import type { Atalho } from "@/lib/conteudo";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createClient } from "@/lib/supabase/server";
import { excluirAtalho, salvarAtalho } from "../actions";

export const metadata: Metadata = { title: "Mais buscados" };

function CamposAtalho({ sufixo, atalho, ordem }: { sufixo: string; atalho?: Atalho; ordem: number }) {
  return (
    <>
      <Campo id={`rotulo-${sufixo}`} name="rotulo" rotulo="Texto" defaultValue={atalho?.rotulo ?? ""} required maxLength={40} />
      <Campo id={`url-${sufixo}`} name="url" rotulo="Link" defaultValue={atalho?.url ?? ""} required placeholder="/pagina ou https://" />
      <Campo id={`ordem-${sufixo}`} name="ordem" rotulo="Ordem" type="number" min={0} defaultValue={atalho?.ordem ?? ordem} />
      <label className="flex items-center gap-2 pb-2">
        <input type="checkbox" name="ativo" defaultChecked={atalho?.ativo ?? true} className="h-4 w-4" />
        Ativo
      </label>
    </>
  );
}

export default async function Atalhos({ params }: PageProps<"/[orgao]/painel/conteudo/atalhos">) {
  const { orgao: slug } = await params;
  const { orgao, papel } = await exigirAcessoOrgao(slug);
  const supabase = await createClient();
  const { data } = await supabase.from("atalhos").select("id, rotulo, url, ordem, ativo").eq("orgao_id", orgao.id).order("ordem").order("rotulo");
  const atalhos = (data ?? []) as Atalho[];
  const podeEditar = papel !== "consulta";
  const grade = "flex flex-wrap items-end gap-3";

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mais buscados</h1>
        <Link href={`/${slug}`}>Ver no portal</Link>
      </div>
      <p className="mt-1 text-texto-suave">
        Atalhos que aparecem abaixo da busca no topo do portal. Sem atalhos ativos, o portal mostra os três primeiros serviços.
      </p>

      {atalhos.length > 0 && (
        <ul className="mt-6 space-y-3">
          {atalhos.map((a) => (
            <li key={a.id} className="rounded border border-borda bg-fundo p-4">
              {podeEditar ? (
                <div className="flex flex-wrap items-end gap-3">
                  <Formulario acao={salvarAtalho} botao="Salvar" className={`${grade} flex-1`}>
                    <input type="hidden" name="orgao" value={slug} />
                    <input type="hidden" name="id" value={a.id} />
                    <CamposAtalho sufixo={a.id} atalho={a} ordem={a.ordem} />
                  </Formulario>
                  <Formulario acao={excluirAtalho} botao={<>Excluir<span className="sr-only"> {a.rotulo}</span></>} className="flex items-end"
                    classeBotao="rounded border border-erro px-3 py-2 font-semibold text-erro">
                    <input type="hidden" name="orgao" value={slug} />
                    <input type="hidden" name="id" value={a.id} />
                  </Formulario>
                </div>
              ) : (
                <p><span className="font-semibold">{a.rotulo}</span> · {a.url}{a.ativo ? "" : " · inativo"}</p>
              )}
            </li>
          ))}
        </ul>
      )}

      {podeEditar && (
        <section aria-labelledby="titulo-novo" className="mt-8 rounded border border-borda bg-fundo p-4">
          <h2 id="titulo-novo" className="text-lg font-semibold">Novo atalho</h2>
          <Formulario acao={salvarAtalho} botao="Incluir" className={`mt-3 ${grade}`}>
            <input type="hidden" name="orgao" value={slug} />
            <CamposAtalho sufixo="novo" ordem={atalhos.length ? Math.max(...atalhos.map((a) => a.ordem)) + 1 : 0} />
          </Formulario>
        </section>
      )}
    </>
  );
}
