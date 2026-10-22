import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/env";

// Ignora RLS. Usar só em ações de servidor que já conferiram a permissão.
export function createAdminClient() {
  const chave = (
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  )?.trim();
  if (!chave) {
    throw new Error("SUPABASE_SECRET_KEY não configurada");
  }
  return createClient(supabaseUrl, chave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
