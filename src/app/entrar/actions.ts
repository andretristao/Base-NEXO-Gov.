"use server";

import { redirect } from "next/navigation";
import type { EstadoFormulario } from "@/components/Formulario";
import { destinoSeguro } from "@/lib/redirecionamento";
import { createClient } from "@/lib/supabase/server";

export async function entrar(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const email = String(dados.get("email") ?? "").trim();
  const senha = String(dados.get("senha") ?? "");
  const proximo = destinoSeguro(dados.get("proximo"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) return { erro: "E-mail ou senha incorretos." };

  const { data: nivel } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (nivel?.nextLevel === "aal2" && nivel.currentLevel !== "aal2") {
    redirect(`/entrar/verificar?proximo=${encodeURIComponent(proximo)}`);
  }
  redirect(proximo);
}

export async function verificarCodigo(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const codigo = String(dados.get("codigo") ?? "").replace(/\D/g, "");
  const proximo = destinoSeguro(dados.get("proximo"));

  const supabase = await createClient();
  const { data: fatores } = await supabase.auth.mfa.listFactors();
  const fator = fatores?.totp.find((f) => f.status === "verified");
  if (!fator) redirect(`/conta/seguranca?proximo=${encodeURIComponent(proximo)}`);

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo });
  if (error) return { erro: "Código inválido ou expirado. Tente o código atual do aplicativo." };

  await supabase.rpc("registrar_evento", {
    p_orgao: null,
    p_acao: "login_2fa",
    p_detalhes: { metodo: "totp" },
  });
  redirect(proximo);
}
