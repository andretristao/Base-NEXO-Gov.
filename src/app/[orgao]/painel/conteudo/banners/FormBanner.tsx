import { Campo, CampoTexto, Formulario } from "@/components/Formulario";
import type { Banner } from "@/lib/conteudo";
import { partesDataHora } from "@/lib/protocolo";
import { salvarBanner } from "../actions";
import { CampoImagem } from "../CampoImagem";

export function FormBanner({ slug, banner, proximaOrdem = 0 }: { slug: string; banner?: Banner; proximaOrdem?: number }) {
  return (
    <Formulario acao={salvarBanner} botao={banner ? "Salvar alterações" : "Incluir banner"} className="mt-4 space-y-4">
      <input type="hidden" name="orgao" value={slug} />
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Campo id="titulo" rotulo="Título" defaultValue={banner?.titulo ?? ""} required maxLength={120} />
          <CampoTexto id="texto" rotulo="Texto" rows={3} defaultValue={banner?.texto ?? ""} maxLength={300} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="link_url" rotulo="Link" defaultValue={banner?.link_url ?? ""} placeholder={`/${slug}/sessoes`}
              ajuda="Página do portal (começa com /) ou endereço https://" />
            <Campo id="link_rotulo" rotulo="Texto do botão" defaultValue={banner?.link_rotulo ?? ""} placeholder="Saiba mais" />
          </div>
        </div>
        <div className="space-y-4">
          <fieldset className="space-y-3 rounded border border-borda bg-fundo p-4">
            <legend className="px-1 font-semibold">Exibição</legend>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="ativo" defaultChecked={banner?.ativo ?? true} className="h-4 w-4" />
              Ativo
            </label>
            <Campo id="ordem" rotulo="Ordem" type="number" min={0} defaultValue={banner?.ordem ?? proximaOrdem}
              ajuda="O menor número aparece primeiro e maior." />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="inicio" rotulo="De" type="date" defaultValue={banner?.inicio_em ? partesDataHora(banner.inicio_em).data : ""} />
              <Campo id="fim" rotulo="Até" type="date" defaultValue={banner?.fim_em ? partesDataHora(banner.fim_em).data : ""} />
            </div>
          </fieldset>
          <CampoImagem caminho={banner?.imagem_caminho} alt={banner?.imagem_alt} />
        </div>
      </div>
    </Formulario>
  );
}
