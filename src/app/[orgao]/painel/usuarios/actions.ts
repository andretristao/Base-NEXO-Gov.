"use server";

import { revalidatePath } from "next/cache";
import type { EstadoFormulario } from "@/components/Formulario";
import { exigirAcessoOrgao } from "@/lib/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Papel } from "@/lib/tipos";

const PAPEIS: Papel[] = ["administrador", "gestor", "editor", "consulta"];

function lerPapel(valor: FormDataEntryValue | null): Papel | null {
  return PAPEIS.includes(valor as Papel) ? (valor as Papel) : null;
}

export async function adicionarUsuario(_: EstadoFormulario, dados: FormData): Promise<EstadoFormulario> {
  const slug = String(dados.get("orgao") ?? "");
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const email = String(dados.get("email") ?? "").trim().toLowerCase();
  const nome = String(dados.get("nome") ?? "").trim();
  const papel = lerPapel(dados.get("papel"));
  if (!email || !papel) return { erro: "Informe e-mail e perfil." };

  const supabase = await createClient();
  let { error } = await supabase.rpc("adicionar_membro", { p_orgao: orgao.id, p_email: email, p_papel: papel });

  // Conta ainda não existe: convida por e-mail e vincula em seguida.
  if (error?.code === "P0002") {
    const admin = createAdminClient();
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    const convite = await admin.auth.admin.inviteUserByEmail(email, {
      data: { nome },
      redirectTo: site ? `${site}/conta/seguranca` : undefined,
    });
    if (convite.error) return { erro: `Não foi possível convidar: ${convite.error.message}` };
    ({ error } = await supabase.rpc("adicionar_membro", { p_orgao: orgao.id, p_email: email, p_papel: papel }));
    if (!error) {
      revalidatePath(`/${slug}/painel/usuarios`);
      return { ok: `Convite enviado para ${email}.` };
    }
  }

  if (error) return { erro: error.message };
  revalidatePath(`/${slug}/painel/usuarios`);
  return { ok: `${email} vinculado como ${papel}.` };
}

export async function alterarMembro(dados: FormData) {
  const slug = String(dados.get("orgao") ?? "");
  const { orgao } = await exigirAcessoOrgao(slug, ["administrador"]);
  const usuarioId = String(dados.get("usuario") ?? "");
  const acao = String(dados.get("acao") ?? "");
  const supabase = await createClient();

  if (acao === "remover") {
    await supabase.from("membros").delete().eq("orgao_id", orgao.id).eq("usuario_id", usuarioId);
  } else {
    const papel = lerPapel(dados.get("papel"));
    if (papel) {
      await supabase.from("membros").update({ papel }).eq("orgao_id", orgao.id).eq("usuario_id", usuarioId);
    }
  }
  revalidatePath(`/${slug}/painel/usuarios`);
}
