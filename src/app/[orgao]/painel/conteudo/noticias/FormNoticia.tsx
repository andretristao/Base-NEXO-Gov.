import { Campo, CampoSelecao, CampoTexto, Formulario } from "@/components/Formulario";
import { CATEGORIAS_SUGERIDAS, type Noticia } from "@/lib/conteudo";
import { partesDataHora } from "@/lib/protocolo";
import { salvarNoticia } from "../actions";
import { CampoImagem } from "../CampoImagem";

// Editor de notícia no estilo do wp-admin: texto à esquerda, caixa "Publicação" à direita.
export function FormNoticia({ slug, noticia, categorias }: { slug: string; noticia?: Noticia; categorias: string[] }) {
  const data = noticia?.publicado_em ? partesDataHora(noticia.publicado_em) : null;
  const sugestoes = [...new Set([...categorias, ...CATEGORIAS_SUGERIDAS])].sort((a, b) => a.localeCompare(b, "pt-BR"));

  return (
    <Formulario acao={salvarNoticia} botao={noticia ? "Salvar alterações" : "Salvar"} className="mt-6 space-y-4">
      <input type="hidden" name="orgao" value={slug} />
      {noticia && <input type="hidden" name="id" value={noticia.id} />}
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-4">
          <Campo id="titulo" rotulo="Título" defaultValue={noticia?.titulo ?? ""} required maxLength={200} />
          <CampoTexto id="resumo" rotulo="Resumo" rows={3} defaultValue={noticia?.resumo ?? ""} maxLength={400}
            ajuda="Aparece nos cartões da página inicial e na lista de notícias." />
          <CampoTexto id="corpo" rotulo="Texto da notícia" rows={14} defaultValue={noticia?.corpo ?? ""}
            ajuda="Separe os parágrafos com uma linha em branco." />
        </div>

        <div className="space-y-4">
          <fieldset className="space-y-3 rounded border border-borda bg-fundo p-4">
            <legend className="px-1 font-semibold">Publicação</legend>
            <CampoSelecao id="situacao" rotulo="Situação" defaultValue={noticia?.publicada ? "publicada" : "rascunho"}
              opcoes={[{ valor: "rascunho", rotulo: "Rascunho (só a equipe vê)" }, { valor: "publicada", rotulo: "Publicada" }]} />
            <div className="grid grid-cols-2 gap-3">
              <Campo id="data" rotulo="Data" type="date" defaultValue={data?.data ?? ""} />
              <Campo id="hora" rotulo="Horário" type="time" defaultValue={data?.hora ?? ""} />
            </div>
            <p className="text-sm text-texto-suave">Em branco, publica agora. Data futura agenda a publicação.</p>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="destaque" defaultChecked={noticia?.destaque} className="h-4 w-4" />
              Destacar na página inicial
            </label>
          </fieldset>

          <div className="rounded border border-borda bg-fundo p-4">
            <Campo id="categoria" rotulo="Categoria" list="categorias" defaultValue={noticia?.categoria ?? ""} />
            <datalist id="categorias">
              {sugestoes.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>

          <CampoImagem caminho={noticia?.imagem_caminho} alt={noticia?.imagem_alt} legenda="Imagem de capa" />
        </div>
      </div>
    </Formulario>
  );
}
