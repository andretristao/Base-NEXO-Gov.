import { Campo } from "@/components/Formulario";
import { urlImagem } from "@/lib/conteudo";

// Imagem com texto alternativo obrigatório, prévia da atual e opção de remover.
export function CampoImagem({ caminho, alt, legenda = "Imagem" }: {
  caminho?: string | null;
  alt?: string | null;
  legenda?: string;
}) {
  const url = urlImagem(caminho ?? null);
  return (
    <fieldset className="space-y-3 rounded border border-borda bg-fundo p-4">
      <legend className="px-1 font-semibold">{legenda}</legend>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt ?? ""} className="max-h-40 w-full rounded object-cover" />
      )}
      <div>
        <label htmlFor="imagem" className="block font-semibold">{url ? "Trocar imagem" : "Enviar imagem"}</label>
        <p id="imagem-ajuda" className="text-sm text-texto-suave">JPG, PNG ou WebP, até 2 MB. Proporção 16:9 fica melhor.</p>
        <input id="imagem" name="imagem" type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="imagem-ajuda"
          className="mt-1 w-full text-sm" />
      </div>
      <Campo id="imagem_alt" rotulo="Texto alternativo" defaultValue={alt ?? ""}
        ajuda="Descreva o que a imagem mostra, para quem usa leitor de tela. Obrigatório quando há imagem." />
      {url && (
        <label className="flex items-center gap-2">
          <input type="checkbox" name="remover_imagem" className="h-4 w-4" />
          Remover a imagem
        </label>
      )}
    </fieldset>
  );
}
