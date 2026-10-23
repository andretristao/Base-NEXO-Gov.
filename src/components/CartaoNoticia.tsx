import Link from "next/link";
import { Icone } from "@/components/Icone";
import { urlImagem, type Noticia } from "@/lib/conteudo";
import { formatarData } from "@/lib/protocolo";

type Resumo = Pick<Noticia, "id" | "titulo" | "resumo" | "categoria" | "imagem_caminho" | "imagem_alt" | "publicado_em">;

// Cartão de notícia do portal. A imagem é decorativa aqui: o título já nomeia o link.
export function CartaoNoticia({ base, noticia, grande = false, nivel = 3 }: {
  base: string;
  noticia: Resumo;
  grande?: boolean;
  nivel?: 2 | 3;
}) {
  const img = urlImagem(noticia.imagem_caminho);
  const Titulo = nivel === 2 ? "h2" : "h3";
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-borda bg-fundo transition hover:shadow-md">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={img} alt="" className={`w-full object-cover ${grande ? "aspect-[16/8]" : "aspect-video"}`} />
      ) : (
        <div className={`flex w-full items-center justify-center bg-orgao/10 text-orgao ${grande ? "aspect-[16/8]" : "aspect-video"}`}>
          <Icone nome="diario" className="h-10 w-10" />
        </div>
      )}
      <div className="flex flex-1 flex-col p-4">
        <p className="flex flex-wrap items-center gap-x-3 text-sm text-texto-suave">
          {noticia.categoria && <span className="font-semibold text-orgao">{noticia.categoria}</span>}
          {noticia.publicado_em && <time dateTime={noticia.publicado_em}>{formatarData(noticia.publicado_em)}</time>}
        </p>
        <Titulo className={`mt-2 font-bold leading-snug ${grande ? "text-xl sm:text-2xl" : "text-lg"}`}>
          <Link href={`${base}/noticias/${noticia.id}`} className="text-texto no-underline group-hover:underline">
            {noticia.titulo}
          </Link>
        </Titulo>
        {noticia.resumo && <p className={`mt-2 text-texto-suave ${grande ? "" : "line-clamp-3 text-sm"}`}>{noticia.resumo}</p>}
      </div>
    </article>
  );
}
