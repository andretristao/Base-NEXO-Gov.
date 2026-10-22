@AGENTS.md

# NEXO Gov

- Idioma do código de domínio, UI e commits: português do Brasil.
- Multi-tenant por `orgao_id` + RLS. Nunca use o cliente admin (`src/lib/supabase/admin.ts`) sem antes chamar `exigirAcessoOrgao`.
- Escrita na área restrita depende de `public.escrita_liberada(orgao_id)` (2FA/aal2).
- A tabela `auditoria` é imutável; registre eventos de app com `rpc('registrar_evento')`.
- Acessibilidade AA é requisito de licitação: use `Campo`/`Formulario`, rótulos visíveis, `caption` em tabelas, e rode axe antes de abrir PR.
- Após mudar migrations, rode `npm run test:db` e acrescente cenários em `supabase/tests/rls_cenarios.sql`.
