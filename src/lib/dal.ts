import "server-only";
import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { supabaseConfigurado } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Orgao, Papel } from "@/lib/tipos";

export type UsuarioAtual = {
  id: string;
  email: string;
  nome: string;
  superadmin: boolean;
  aal: "aal1" | "aal2";
  temFator2fa: boolean;
};

// Lê e valida a sessão (assinatura do JWT) uma vez por requisição.
export const getUsuarioAtual = cache(async (): Promise<UsuarioAtual | null> => {
  if (!supabaseConfigurado()) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  const [{ data: perfil }, { data: nivel }] = await Promise.all([
    supabase.from("usuarios").select("nome, email, superadmin").eq("id", claims.sub).single(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);

  return {
    id: claims.sub,
    email: perfil?.email ?? String(claims.email ?? ""),
    nome: perfil?.nome || String(claims.email ?? ""),
    superadmin: perfil?.superadmin ?? false,
    aal: nivel?.currentLevel === "aal2" ? "aal2" : "aal1",
    temFator2fa: nivel?.nextLevel === "aal2",
  };
});

export async function exigirUsuario(proximo = "/painel") {
  const usuario = await getUsuarioAtual();
  if (!usuario) redirect(`/entrar?proximo=${encodeURIComponent(proximo)}`);
  return usuario;
}

export const getOrgaoPorSlug = cache(async (slug: string): Promise<Orgao | null> => {
  if (!supabaseConfigurado()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("orgaos").select("*").eq("slug", slug).maybeSingle();
  return (data as Orgao | null) ?? null;
});

export async function exigirOrgao(slug: string) {
  const orgao = await getOrgaoPorSlug(slug);
  if (!orgao) notFound();
  return orgao;
}

export type AcessoOrgao = {
  usuario: UsuarioAtual;
  orgao: Orgao;
  papel: Papel | "superadmin";
};

// Guarda da área restrita: membro do órgão e, se exigido, sessão com 2FA.
export async function exigirAcessoOrgao(slug: string, papeis?: Papel[]): Promise<AcessoOrgao> {
  const usuario = await exigirUsuario(`/${slug}/painel`);
  const orgao = await exigirOrgao(slug);

  const precisa2fa = orgao.exigir_2fa || usuario.superadmin;
  if (precisa2fa && usuario.aal !== "aal2") {
    redirect(
      usuario.temFator2fa
        ? `/entrar/verificar?proximo=/${slug}/painel`
        : `/conta/seguranca?proximo=/${slug}/painel`,
    );
  }

  let papel: AcessoOrgao["papel"];
  if (usuario.superadmin) {
    papel = "superadmin";
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("membros")
      .select("papel")
      .eq("orgao_id", orgao.id)
      .eq("usuario_id", usuario.id)
      .eq("ativo", true)
      .maybeSingle();
    if (!data) notFound();
    papel = data.papel as Papel;
  }

  if (papeis && papel !== "superadmin" && !papeis.includes(papel)) {
    redirect(`/${slug}/painel`);
  }

  return { usuario, orgao, papel };
}

export function podeAdministrar(papel: AcessoOrgao["papel"]) {
  return papel === "superadmin" || papel === "administrador";
}
