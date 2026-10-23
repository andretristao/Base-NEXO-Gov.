"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type KeyboardEvent } from "react";
import { Icone } from "@/components/Icone";
import { normalizar } from "@/lib/portal";
import { buscarNoPainel, type ResultadoBusca } from "./actions";
import type { ItemMenu } from "./MenuPainel";

// Busca rápida da área restrita: abre com Ctrl+K (ou Cmd+K) e com o botão da barra.
// Usa <dialog> nativo, que prende o foco e fecha com Esc.
export function BuscaPainel({ slug, atalhos }: { slug: string; atalhos: ItemMenu[] }) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const lista = useRef<HTMLDivElement>(null);
  const [termo, setTermo] = useState("");
  const [documentos, setDocumentos] = useState<ResultadoBusca[]>([]);
  const [buscando, iniciar] = useTransition();

  function abrir() {
    dialogo.current?.showModal();
  }

  function fechar() {
    dialogo.current?.close();
  }

  useEffect(() => {
    function tecla(e: globalThis.KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialogo.current?.open) fechar();
        else abrir();
      }
    }
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, []);

  useEffect(() => {
    const t = termo.trim();
    if (t.length < 2) return;
    const espera = setTimeout(() => {
      iniciar(async () => setDocumentos(await buscarNoPainel(slug, t)));
    }, 250);
    return () => clearTimeout(espera);
  }, [termo, slug]);

  const palavras = normalizar(termo).split(/\s+/).filter(Boolean);
  const paginas = palavras.length
    ? atalhos.filter((a) => palavras.every((p) => normalizar(a.rotulo).includes(p)))
    : atalhos;
  const docs = termo.trim().length >= 2 ? documentos : [];

  // Setas movem o foco entre o campo e os resultados.
  function navegar(e: KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = Array.from(lista.current?.querySelectorAll<HTMLElement>("a") ?? []);
    const campo = dialogo.current?.querySelector<HTMLElement>("input");
    const alvos = campo ? [campo, ...links] : links;
    const atual = alvos.indexOf(document.activeElement as HTMLElement);
    const proximo = e.key === "ArrowDown" ? Math.min(alvos.length - 1, atual + 1) : Math.max(0, atual - 1);
    alvos[proximo]?.focus();
    e.preventDefault();
  }

  const estilo = "flex items-start gap-3 rounded px-3 py-2 text-texto no-underline hover:bg-fundo-suave focus:bg-fundo-suave";

  return (
    <>
      <button
        id="busca"
        type="button"
        onClick={abrir}
        className="flex items-center gap-2 rounded border border-white/40 px-3 py-1 text-white hover:bg-white/10"
      >
        <Icone nome="busca" className="h-4 w-4" />
        Buscar
        <kbd className="hidden rounded bg-white/15 px-1.5 text-xs sm:inline">Ctrl K</kbd>
      </button>

      <dialog
        ref={dialogo}
        aria-labelledby="titulo-busca-painel"
        onClose={() => setTermo("")}
        onKeyDown={navegar}
        className="m-auto mt-[10vh] w-[min(40rem,calc(100%-2rem))] rounded-lg border border-borda bg-fundo p-0 text-texto shadow-2xl backdrop:bg-black/50"
      >
        <div className="flex items-center gap-2 border-b border-borda px-4 py-3">
          <h2 id="titulo-busca-painel" className="sr-only">Busca rápida</h2>
          <Icone nome="busca" className="h-5 w-5 text-texto-suave" />
          <label htmlFor="busca-painel" className="sr-only">Buscar documentos e páginas</label>
          <input
            id="busca-painel"
            type="search"
            autoComplete="off"
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Protocolo, PL 12/2026, assunto ou página"
            className="min-w-0 flex-1 bg-transparent py-1 text-lg outline-none"
          />
          <button type="button" onClick={fechar} className="rounded border border-borda px-2 text-sm">Esc</button>
        </div>

        <div ref={lista} className="max-h-[60vh] overflow-y-auto p-2">
          <p role="status" aria-live="polite" className="sr-only">
            {buscando ? "Buscando" : `${docs.length} documento(s) e ${paginas.length} página(s)`}
          </p>

          {docs.length > 0 && (
            <section aria-labelledby="busca-docs">
              <h3 id="busca-docs" className="px-3 pt-2 text-xs font-semibold uppercase text-texto-suave">Documentos</h3>
              <ul>
                {docs.map((d) => (
                  <li key={d.id}>
                    <Link href={`/${slug}/painel/documentos/${d.id}`} onClick={fechar} className={estilo}>
                      <Icone nome="documento" className="mt-0.5 h-5 w-5 text-texto-suave" />
                      <span>
                        <span className="block font-semibold">{d.titulo}</span>
                        <span className="block text-sm text-texto-suave">{d.assunto} · {d.situacao}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {termo.trim().length >= 2 && !buscando && docs.length === 0 && (
            <p className="px-3 py-2 text-sm text-texto-suave">Nenhum documento encontrado.</p>
          )}

          {paginas.length > 0 && (
            <section aria-labelledby="busca-paginas">
              <h3 id="busca-paginas" className="px-3 pt-2 text-xs font-semibold uppercase text-texto-suave">Ir para</h3>
              <ul>
                {paginas.map((a) => (
                  <li key={a.href}>
                    <Link href={a.href} onClick={fechar} className={estilo}>
                      <Icone nome={a.icone} className="mt-0.5 h-5 w-5 text-texto-suave" />
                      <span className="font-semibold">{a.rotulo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </dialog>
    </>
  );
}
