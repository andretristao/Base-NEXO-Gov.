# NEXO Gov · Base multi-cliente

Plataforma de serviços digitais para órgãos públicos (prefeituras, câmaras e conselhos).
Esta é a base comum: cada órgão é um tenant isolado por RLS no Supabase, e os módulos
(Diário Oficial, Transparência, PNCP, Cesta de preços, Ouvidoria/e-SIC) são construídos em cima dela.

## O que a base entrega

| Requisito | Como é atendido |
|---|---|
| Multi-cliente | Tabela `orgaos`; cada órgão em `/<slug>`; RLS isola dados por órgão |
| Perfis de acesso | `administrador`, `gestor`, `editor`, `consulta` por órgão; `superadmin` para a equipe NEXO |
| 2FA | TOTP (Supabase MFA). Escrita exige sessão `aal2` quando o órgão tem `exigir_2fa` |
| Trilha de auditoria | Tabela `auditoria` append-only, preenchida por gatilho; nem o service role altera ou apaga |
| LGPD | Encarregado por órgão, política de privacidade por órgão, dados mínimos |
| Acessibilidade | eMAG 3.1 e WCAG 2.1 AA: atalhos Alt+1..4, alto contraste, fonte ajustável, VLibras, foco visível. Auditado com axe-core sem violações |
| Hospedagem no Brasil | Supabase em `sa-east-1` (São Paulo) e funções Vercel em `gru1` (`vercel.json`) |

## Módulo Protocolo e Processo Legislativo

| Recurso | Onde |
|---|---|
| Tipos de documento (ofício, PL, decreto, requerimento, indicação, moção, ata) com numeração automática por ano | Painel › Configurar protocolo › Tipos |
| Setores e fluxos de tramitação com etapas/status configuráveis (ex.: Criada → Análise → Secretaria → Jurídico → Publicada) | Painel › Configurar protocolo › Fluxos e etapas |
| Modelo padrão de câmara ou prefeitura em um clique | Painel › Configurar protocolo |
| Protocolo geral `AAAA/NNNNNN`, anexos (até 4 MB), tramitação com despacho e histórico imutável | Painel › Documentos |
| Publicação restrita a gestor/administrador; documento publicado não é editado nem excluído | `tramitar_documento()` no banco |
| Sessões ordinárias, extraordinárias, solenes e especiais com pauta por fase (Expediente, Tribuna Livre, Ordem do Dia…) e resultado | Painel › Sessões |
| Ata gerada a partir da pauta, que segue o fluxo de atas | Painel › Sessão › Gerar ata |
| Portal: sessões, proposições e atos publicados, consulta de protocolo (sem despachos nem dados pessoais) | `/<orgao>/sessoes`, `/<orgao>/documentos`, `/<orgao>/protocolo` |

## Stack

Next.js 16 (App Router, TypeScript, Tailwind 4) na Vercel · Supabase (Postgres, Auth, RLS) · n8n para integrações.

> Next.js 16 mudou várias APIs (ex.: `middleware` virou `proxy`). Consulte `node_modules/next/dist/docs/` antes de escrever código novo.

## Estrutura

```
src/proxy.ts                     renova a sessão e protege rotas restritas
src/lib/dal.ts                   leitura de usuário/órgão e guardas de acesso
src/lib/supabase/                clientes (servidor, navegador, admin)
src/app/[orgao]/                 portal público do órgão
src/app/[orgao]/painel/          área restrita (protocolo, sessões, configuração, usuários, auditoria)
src/app/entrar, conta/seguranca  login e cadastro/validação do 2FA
supabase/migrations/             schema, RLS e auditoria
supabase/tests/                  cenários de RLS rodando em Postgres local
scripts/seed-demo.ts             órgãos e usuários fictícios para POC
```

## Rodar localmente

1. `cp .env.example .env.local` e preencha com as chaves do projeto Supabase.
2. `npm install`
3. `npx supabase link --project-ref <ref>` e `npm run db:push` para aplicar as migrations.
4. `npm run seed:demo` para criar a Prefeitura e a Câmara fictícias de Vila Esperança.
5. `npm run dev` e abra http://localhost:3000

Testes de RLS (precisa de um Postgres local): `PGHOST=/tmp PGUSER=postgres npm run test:db`.

## Novo módulo: convenções

- Toda tabela de módulo tem `orgao_id uuid not null references orgaos(id)`.
- Políticas usam `public.is_membro`, `public.tem_papel` e `public.escrita_liberada`.
- Anexe `public.auditar()` como gatilho `after insert or update or delete`.
- Rotas públicas em `src/app/[orgao]/<modulo>`, restritas em `src/app/[orgao]/painel/<modulo>`.
