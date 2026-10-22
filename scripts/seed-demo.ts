// Cria órgãos e usuários fictícios para demonstração e POC.
// Uso: npm run seed:demo   (lê .env.local; precisa de SUPABASE_SECRET_KEY)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const chave = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const senha = process.env.DEMO_PASSWORD;
const superadminEmail = process.env.SEED_SUPERADMIN_EMAIL?.toLowerCase();
const dominio = process.env.DEMO_EMAIL_DOMAIN ?? "demo.nexoprojetosdesign.com.br";

if (!url || !chave) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SECRET_KEY no .env.local");
if (!senha || senha.length < 12) throw new Error("Defina DEMO_PASSWORD com pelo menos 12 caracteres");

const supabase = createClient(url, chave, { auth: { autoRefreshToken: false, persistSession: false } });

// CNPJs fictícios (prefixo 99, dígitos verificadores válidos).
const orgaos = [
  {
    slug: "vila-esperanca",
    nome: "Prefeitura Municipal de Vila Esperança",
    nome_curto: "Prefeitura de Vila Esperança",
    tipo: "prefeitura",
    cnpj: "99000001000101",
    uf: "MG",
    municipio: "Vila Esperança",
    endereco: "Praça da Matriz, 100, Centro, Vila Esperança/MG, CEP 39999-000",
    telefone: "(38) 3999-1000",
    email_contato: `contato@${dominio}`,
    encarregado_nome: "Mariana Duarte (fictício)",
    encarregado_email: `lgpd@${dominio}`,
    cor_primaria: "#0c4a6e",
  },
  {
    slug: "camara-vila-esperanca",
    nome: "Câmara Municipal de Vila Esperança",
    nome_curto: "Câmara de Vila Esperança",
    tipo: "camara",
    cnpj: "99000002000148",
    uf: "MG",
    municipio: "Vila Esperança",
    endereco: "Rua das Flores, 45, Centro, Vila Esperança/MG, CEP 39999-010",
    telefone: "(38) 3999-2000",
    email_contato: `camara@${dominio}`,
    encarregado_nome: "Paulo Henrique Lima (fictício)",
    encarregado_email: `lgpd.camara@${dominio}`,
    cor_primaria: "#7c2d12",
  },
] as const;

const pessoas = [
  { email: `admin@${dominio}`, nome: "Ana Administradora", vinculos: { "vila-esperanca": "administrador", "camara-vila-esperanca": "administrador" } },
  { email: `gestor@${dominio}`, nome: "Gustavo Gestor", vinculos: { "vila-esperanca": "gestor" } },
  { email: `editor@${dominio}`, nome: "Eduarda Editora", vinculos: { "vila-esperanca": "editor" } },
  { email: `controle@${dominio}`, nome: "Carlos Controle Interno", vinculos: { "vila-esperanca": "consulta" } },
] as const;

async function garantirUsuario(email: string, nome: string, comSenha: boolean) {
  const { data: existente } = await supabase.from("usuarios").select("id").eq("email", email).maybeSingle();
  if (existente) return existente.id as string;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
    password: comSenha ? senha : undefined,
    user_metadata: { nome },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  const { data: criados, error } = await supabase
    .from("orgaos")
    .upsert(orgaos, { onConflict: "slug" })
    .select("id, slug");
  if (error) throw error;
  const idPorSlug = new Map(criados.map((o) => [o.slug, o.id as string]));
  console.log(`Órgãos: ${[...idPorSlug.keys()].join(", ")}`);

  for (const p of pessoas) {
    const id = await garantirUsuario(p.email, p.nome, true);
    const linhas = Object.entries(p.vinculos).map(([slug, papel]) => ({
      orgao_id: idPorSlug.get(slug)!,
      usuario_id: id,
      papel,
    }));
    const { error: e } = await supabase.from("membros").upsert(linhas, { onConflict: "orgao_id,usuario_id" });
    if (e) throw e;
    console.log(`Usuário: ${p.email}`);
  }

  if (superadminEmail) {
    const { data: u } = await supabase.from("usuarios").select("id").eq("email", superadminEmail).maybeSingle();
    if (!u) {
      console.log(`Superadmin ${superadminEmail} ainda não tem conta. Crie em Authentication > Users e rode de novo.`);
    } else {
      const { error: e } = await supabase.from("usuarios").update({ superadmin: true }).eq("id", u.id);
      if (e) throw e;
      console.log(`Superadmin: ${superadminEmail}`);
    }
  }

  console.log("\nPronto. Senha dos usuários de demonstração: a definida em DEMO_PASSWORD.");
  console.log("No primeiro acesso, cada um cadastra o autenticador (2FA).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
