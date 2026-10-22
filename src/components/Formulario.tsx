"use client";

import { useActionState, type ReactNode } from "react";

export type EstadoFormulario = { erro?: string; ok?: string } | undefined;

type Acao = (estado: EstadoFormulario, dados: FormData) => Promise<EstadoFormulario>;

// Formulário com mensagem de erro/sucesso anunciada a leitores de tela.
export function Formulario({ acao, children, botao, className }: {
  acao: Acao;
  children: ReactNode;
  botao: string;
  className?: string;
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
        className="botao-primario"
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
