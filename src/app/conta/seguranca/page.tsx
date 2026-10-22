import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaginaSimples } from "@/components/PaginaSimples";
import { exigirUsuario } from "@/lib/dal";
import { destinoSeguro } from "@/lib/redirecionamento";
import { Cadastro2fa } from "./Cadastro2fa";

export const metadata: Metadata = { title: "Segurança da conta" };

export default async function Seguranca({ searchParams }: PageProps<"/conta/seguranca">) {
  const proximo = destinoSeguro((await searchParams).proximo);
  const usuario = await exigirUsuario("/conta/seguranca");

  if (usuario.temFator2fa) {
    if (usuario.aal !== "aal2") redirect(`/entrar/verificar?proximo=${encodeURIComponent(proximo)}`);
    return (
      <PaginaSimples titulo="Segurança da conta">
        <p>A autenticação em dois fatores está ativa para {usuario.email}.</p>
        <p className="mt-4">Para trocar de celular, peça ao administrador do órgão ou à equipe NEXO para redefinir o seu fator.</p>
      </PaginaSimples>
    );
  }

  return (
    <PaginaSimples titulo="Ative a autenticação em dois fatores">
      <Cadastro2fa proximo={proximo} />
    </PaginaSimples>
  );
}
