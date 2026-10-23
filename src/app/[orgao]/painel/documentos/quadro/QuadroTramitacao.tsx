"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition, type DragEvent, type FormEvent } from "react";
import type { NaturezaEtapa } from "@/lib/protocolo";
import { moverDocumento } from "../actions";

export type ColunaQuadro = { id: string; nome: string; natureza: NaturezaEtapa; setor: string | null };
export type CartaoQuadro = {
  id: string;
  etapa_id: string;
  protocolo: string;
  titulo: string;
  assunto: string;
  setor: string | null;
  parado: string;
  finalizado: boolean;
};

// Quadro kanban da tramitação. Arrastar um cartão para outra coluna chama
// tramitar_documento(); quem não usa mouse tem o seletor "Mover para" em cada cartão.
export function QuadroTramitacao({ slug, colunas, cartoes, podeMover }: {
  slug: string;
  colunas: ColunaQuadro[];
  cartoes: CartaoQuadro[];
  podeMover: boolean;
}) {
  const [visiveis, aplicar] = useOptimistic(cartoes, (atual, mov: { id: string; etapa: string }) =>
    atual.map((c) => (c.id === mov.id ? { ...c, etapa_id: mov.etapa } : c)),
  );
  const [, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ erro: boolean; texto: string } | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);

  function mover(id: string, etapa: string) {
    const cartao = visiveis.find((c) => c.id === id);
    const coluna = colunas.find((c) => c.id === etapa);
    if (!cartao || !coluna || cartao.etapa_id === etapa) return;
    iniciar(async () => {
      aplicar({ id, etapa });
      const r = await moverDocumento(slug, id, etapa);
      setAviso(r.erro
        ? { erro: true, texto: `${cartao.protocolo}: ${r.erro}` }
        : { erro: false, texto: `${cartao.protocolo} movido para ${coluna.nome}.` });
    });
  }

  function soltar(e: DragEvent, etapa: string) {
    e.preventDefault();
    setAlvo(null);
    mover(e.dataTransfer.getData("text/plain"), etapa);
  }

  function enviar(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    mover(id, String(new FormData(e.currentTarget).get("etapa")));
  }

  return (
    <>
      <div role="status" aria-live="polite" className="min-h-6">
        {aviso && <p className={`font-semibold ${aviso.erro ? "text-erro" : "text-sucesso"}`}>{aviso.texto}</p>}
      </div>

      <div
        tabIndex={0}
        role="region"
        aria-label="Colunas do quadro; role horizontalmente para ver todas"
        className="mt-2 flex gap-4 overflow-x-auto pb-4"
      >
        {colunas.map((col) => {
          const itens = visiveis.filter((c) => c.etapa_id === col.id);
          return (
            <section
              key={col.id}
              aria-labelledby={`col-${col.id}`}
              onDragOver={podeMover ? (e) => { e.preventDefault(); setAlvo(col.id); } : undefined}
              onDragLeave={podeMover ? () => setAlvo((a) => (a === col.id ? null : a)) : undefined}
              onDrop={podeMover ? (e) => soltar(e, col.id) : undefined}
              className={`flex w-64 shrink-0 flex-col rounded-lg border-2 bg-fundo p-3 ${
                alvo === col.id ? "border-orgao border-dashed" : "border-transparent"
              }`}
            >
              <h2 id={`col-${col.id}`} className="flex items-center justify-between gap-2 font-semibold">
                <span>
                  {col.nome}
                  {col.natureza !== "andamento" && (
                    <span className="block text-xs font-normal text-texto-suave">
                      {col.natureza === "conclusao" ? "Publica o documento · recentes" : "Arquivamento · recentes"}
                    </span>
                  )}
                </span>
                <span className="rounded-full bg-fundo-suave px-2 text-sm">{itens.length}</span>
              </h2>
              {col.setor && <p className="text-xs text-texto-suave">Setor: {col.setor}</p>}

              <ul className="mt-3 space-y-2">
                {itens.map((c) => {
                  const arrastavel = podeMover && !c.finalizado;
                  return (
                    <li
                      key={c.id}
                      draggable={arrastavel}
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", c.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className={`rounded border border-borda bg-fundo p-3 text-sm shadow-sm ${arrastavel ? "cursor-grab active:cursor-grabbing" : ""}`}
                    >
                      <Link href={`/${slug}/painel/documentos/${c.id}`} className="font-semibold">{c.titulo}</Link>
                      <p className="text-xs text-texto-suave">{c.protocolo}{c.setor ? ` · ${c.setor}` : ""}</p>
                      <p className="mt-1 line-clamp-2">{c.assunto}</p>
                      <p className="mt-1 text-xs text-texto-suave">Última alteração {c.parado}</p>
                      {arrastavel && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs underline">Mover para…</summary>
                          <form onSubmit={(e) => enviar(e, c.id)} className="mt-2 flex gap-2">
                            <label htmlFor={`mover-${c.id}`} className="sr-only">Mover {c.protocolo} para a etapa</label>
                            <select id={`mover-${c.id}`} name="etapa" defaultValue={c.etapa_id}
                              className="min-w-0 flex-1 rounded border border-borda bg-fundo px-2 py-1 text-xs">
                              {colunas.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
                            </select>
                            <button type="submit" className="rounded border border-borda px-2 text-xs font-semibold">Mover</button>
                          </form>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
              {itens.length === 0 && (
                <p className="mt-2 rounded border border-dashed border-borda p-3 text-center text-sm text-texto-suave">
                  {podeMover ? "Arraste um documento para cá" : "Vazio"}
                </p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
