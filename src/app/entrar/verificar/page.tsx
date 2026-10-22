import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Campo, Formulario } from "@/components/Formulario";
import { PaginaSimples } from "@/components/PaginaSimples";
import { exigirUsuario } from "@/lib/dal";
import { destinoSeguro } from "@/lib/redirecionamento";
import { verificarCodigo } from "../actions";

export const metadata: Metadata = { title: "Verificação em dois fatores" };

export default async function Verificar({ searchParams }: PageProps<"/entrar/verificar">) {
  const proximo = destinoSeguro((await searchParams).proximo);
  const usuario = await exigirUsuario(proximo);
  if (usuario.aal === "aal2") redirect(proximo);
  if (!usuario.temFator2fa) redirect(`/conta/seguranca?proximo=${encodeURIComponent(proximo)}`);

  return (
    <PaginaSimples titulo="Verificação em dois fatores">
      <Formulario acao={verificarCodigo} botao="Verificar">
        <input type="hidden" name="proximo" value={proximo} />
        <Campo
          id="codigo"
          rotulo="Código de 6 dígitos"
          ajuda="Abra o aplicativo autenticador (Google Authenticator, Microsoft Authenticator ou similar)."
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          autoFocus
        />
      </Formulario>
    </PaginaSimples>
  );
}
