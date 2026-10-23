"use client";

import { useEffect, useState } from "react";

const ESCALAS = [1, 1.125, 1.25, 1.5];

function ler(chave: string) {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
}

function gravar(chave: string, valor: string) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // navegação privada: a preferência vale só nesta página
  }
}

// Atalhos de teclado do eMAG (Alt+1..4), contraste e tamanho da fonte.
export function BarraAcessibilidade({ linkAcessibilidade }: { linkAcessibilidade: string }) {
  const [contraste, setContraste] = useState(false);
  const [escala, setEscala] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza com o script inline do layout
    setContraste(document.documentElement.classList.contains("alto-contraste"));
    const salva = Number(ler("nexo:escala"));
    setEscala(Number.isInteger(salva) && salva > 0 && salva < ESCALAS.length ? salva : 0);
  }, []);

  function alternarContraste() {
    const novo = !contraste;
    document.documentElement.classList.toggle("alto-contraste", novo);
    gravar("nexo:contraste", novo ? "1" : "0");
    setContraste(novo);
  }

  function mudarFonte(delta: number) {
    const nova = Math.min(ESCALAS.length - 1, Math.max(0, escala + delta));
    document.documentElement.style.setProperty("--escala-fonte", String(ESCALAS[nova]));
    gravar("nexo:escala", String(nova));
    setEscala(nova);
  }

  return (
    <nav aria-label="Acessibilidade" className="bg-fundo-suave border-b border-borda text-sm">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-1">
        <ul className="flex flex-wrap gap-x-4">
          <li><a href="#conteudo" accessKey="1">Ir para o conteúdo [1]</a></li>
          <li><a href="#menu" accessKey="2">Ir para o menu [2]</a></li>
          <li><a href="#busca" accessKey="3">Ir para a busca [3]</a></li>
          <li><a href="#rodape" accessKey="4">Ir para o rodapé [4]</a></li>
        </ul>
        <ul className="flex flex-wrap items-center gap-x-4">
          <li><a href={linkAcessibilidade}>Acessibilidade</a></li>
          <li>
            <button type="button" onClick={alternarContraste} aria-pressed={contraste} className="underline">
              Alto contraste
            </button>
          </li>
          <li className="flex gap-2">
            <button type="button" onClick={() => mudarFonte(1)} className="underline">A+<span className="sr-only"> aumentar fonte</span></button>
            <button type="button" onClick={() => mudarFonte(-1)} className="underline">A-<span className="sr-only"> diminuir fonte</span></button>
          </li>
        </ul>
      </div>
    </nav>
  );
}
