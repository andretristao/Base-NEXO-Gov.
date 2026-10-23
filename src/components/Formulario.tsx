"use client";

import { useActionState, type ReactNode } from "react";

export type EstadoFormulario = { erro?: string; ok?: string } | undefined;

type Acao = (estado: EstadoFormulario, dados: FormData) => Promise<EstadoFormulario>;

// Formulário com mensagem de erro/sucesso anunciada a leitores de tela.
export function Formulario({ acao, children, botao, className, classeBotao }: {
  acao: Acao;
  children: ReactNode;
  botao: ReactNode;
  className?: string;
  classeBotao?: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, undefined);

  return (
    <form action={enviar} className={className ?? "space-y-4"}>
      {children}
      <div role="status" aria-live="polite">
        {estado?.erro && <p className="font-semibold text-erro">{estado.erro}</p>}
        {estado?.ok && <p className="font-semibold text-sucesso">{estado.ok}</p>}
      </div>
      <button
        type="submit"
        disabled={pendente}
        className={classeBotao ?? "botao-primario"}
      >
        {pendente ? "Aguarde…" : botao}
      </button>
    </form>
  );
}

export function Campo({ id, rotulo, ajuda, ...props }: {
  id: string;
  rotulo: string;
  ajuda?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">{rotulo}</label>
      {ajuda && <p id={`${id}-ajuda`} className="text-sm text-texto-suave">{ajuda}</p>}
      <input
        id={id}
        name={id}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className="mt-1 w-full rounded border border-borda bg-fundo px-3 py-2"
        {...props}
      />
    </div>
  );
}

export function CampoSelecao({ id, rotulo, ajuda, opcoes, vazio, ...props }: {
  id: string;
  rotulo: string;
  ajuda?: string;
  opcoes: { valor: string; rotulo: string; grupo?: string }[];
  // texto da opção vazia; omitido = sem opção vazia
  vazio?: string;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const grupos = [...new Set(opcoes.map((o) => o.grupo ?? ""))];
  const renderizar = (lista: typeof opcoes) =>
    lista.map((o) => <option key={o.valor} value={o.valor}>{o.rotulo}</option>);

  return (
    <div>
      <label htmlFor={id} className="block font-semibold">{rotulo}</label>
      {ajuda && <p id={`${id}-ajuda`} className="text-sm text-texto-suave">{ajuda}</p>}
      <select
        id={id}
        name={id}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className="mt-1 w-full rounded border border-borda bg-fundo px-3 py-2"
        {...props}
      >
        {vazio !== undefined && <option value="">{vazio}</option>}
        {grupos.length > 1 || grupos[0]
          ? grupos.map((g) => (
              <optgroup key={g} label={g || "Outros"}>
                {renderizar(opcoes.filter((o) => (o.grupo ?? "") === g))}
              </optgroup>
            ))
          : renderizar(opcoes)}
      </select>
    </div>
  );
}

export function CampoTexto({ id, rotulo, ajuda, ...props }: {
  id: string;
  rotulo: string;
  ajuda?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div>
      <label htmlFor={id} className="block font-semibold">{rotulo}</label>
      {ajuda && <p id={`${id}-ajuda`} className="text-sm text-texto-suave">{ajuda}</p>}
      <textarea
        id={id}
        name={id}
        aria-describedby={ajuda ? `${id}-ajuda` : undefined}
        className="mt-1 w-full rounded border border-borda bg-fundo px-3 py-2"
        rows={6}
        {...props}
      />
    </div>
  );
}
