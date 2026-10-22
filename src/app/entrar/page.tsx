import type { Metadata } from "next";
import { Campo, Formulario } from "@/components/Formulario";
import { PaginaSimples } from "@/components/PaginaSimples";
import { destinoSeguro } from "@/lib/redirecionamento";
import { entrar } from "./actions";

export const metadata: Metadata = { title: "Entrar" };

export default async function Entrar({ searchParams }: PageProps<"/entrar">) {
  const proximo = destinoSeguro((await searchParams).proximo);

  return (
    <PaginaSimples titulo="Acesso restrito">
      <Formulario acao={entrar} botao="Entrar">
        <input type="hidden" name="proximo" value={proximo} />
        <Campo id="email" rotulo="E-mail" type="email" autoComplete="username" required />
        <Campo id="senha" rotulo="Senha" type="password" autoComplete="current-password" required />
      </Formulario>
      <p className="mt-6 text-sm text-texto-suave">
        O acesso de servidores exige autenticação em dois fatores.
      </p>
    </PaginaSimples>
  );
}
