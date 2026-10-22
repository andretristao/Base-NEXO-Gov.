// Aceita as chaves novas (publishable/secret) e as antigas (anon/service_role)
// para funcionar tanto com a integração Vercel ↔ Supabase quanto com .env manual.
export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export function supabaseConfigurado() {
  return supabaseUrl !== "" && supabasePublishableKey !== "";
}
