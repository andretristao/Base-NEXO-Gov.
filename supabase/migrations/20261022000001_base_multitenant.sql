-- NEXO Gov · Base multi-cliente
-- Um órgão público por tenant. Isolamento por RLS, perfis por órgão,
-- 2FA exigido para escrita (aal2) e trilha de auditoria imutável.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

create type public.tipo_orgao as enum (
  'prefeitura', 'camara', 'conselho', 'autarquia', 'consorcio'
);

-- administrador: gerencia o órgão e seus usuários
-- gestor: aprova e publica conteúdo dos módulos
-- editor: cria e edita rascunhos
-- consulta: somente leitura na área restrita (ex.: controle interno)
create type public.papel_orgao as enum (
  'administrador', 'gestor', 'editor', 'consulta'
);

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.orgaos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique
    check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
    -- rotas fixas do app não podem ser usadas como endereço de órgão
    check (slug not in ('api', 'entrar', 'sair', 'conta', 'painel', 'auth', 'admin', 'nexo')),
  nome text not null,
  nome_curto text,
  tipo public.tipo_orgao not null,
  cnpj text unique check (cnpj ~ '^\d{14}$'),
  uf char(2) not null,
  municipio text not null,
  codigo_ibge text check (codigo_ibge ~ '^\d{7}$'),
  endereco text,
  telefone text,
  email_contato text,
  -- LGPD: encarregado pelo tratamento de dados pessoais (art. 41)
  encarregado_nome text,
  encarregado_email text,
  brasao_url text,
  cor_primaria text not null default '#1351b4' check (cor_primaria ~ '^#[0-9a-fA-F]{6}$'),
  dominio text unique,
  exigir_2fa boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.orgaos is 'Tenants: cada órgão público atendido pela plataforma.';

create table public.usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  email text not null check (email = lower(email)),
  telefone text,
  superadmin boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

comment on table public.usuarios is 'Perfil público de cada conta. superadmin = equipe NEXO.';

create table public.membros (
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  usuario_id uuid not null references public.usuarios (id) on delete cascade,
  papel public.papel_orgao not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  primary key (orgao_id, usuario_id)
);

create index membros_usuario_idx on public.membros (usuario_id);

create table public.auditoria (
  id bigint generated always as identity primary key,
  -- sem chave estrangeira: o registro sobrevive à exclusão do órgão
  orgao_id uuid,
  usuario_id uuid,
  acao text not null,
  tabela text,
  registro_id text,
  dados_antes jsonb,
  dados_depois jsonb,
  detalhes jsonb,
  ip text,
  user_agent text,
  criado_em timestamptz not null default now()
);

create index auditoria_orgao_idx on public.auditoria (orgao_id, criado_em desc);
create index auditoria_usuario_idx on public.auditoria (usuario_id, criado_em desc);

comment on table public.auditoria is 'Trilha de auditoria append-only. Nenhum perfil pode alterar ou apagar registros.';

-- ---------------------------------------------------------------------------
-- Funções de apoio às políticas (security definer evita recursão de RLS)
-- ---------------------------------------------------------------------------

create function public.is_superadmin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select u.superadmin from public.usuarios u where u.id = auth.uid()),
    false
  );
$$;

create function public.sessao_aal2()
returns boolean
language sql stable set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

create function public.papel_no_orgao(p_orgao uuid)
returns public.papel_orgao
language sql stable security definer set search_path = ''
as $$
  select m.papel from public.membros m
  where m.orgao_id = p_orgao and m.usuario_id = auth.uid() and m.ativo;
$$;

create function public.tem_papel(p_orgao uuid, p_papeis public.papel_orgao[])
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_superadmin()
      or coalesce(public.papel_no_orgao(p_orgao) = any (p_papeis), false);
$$;

create function public.is_membro(p_orgao uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.is_superadmin() or public.papel_no_orgao(p_orgao) is not null;
$$;

-- Escrita na área restrita: exige 2FA quando o órgão (ou a equipe NEXO) assim pede.
create function public.escrita_liberada(p_orgao uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.sessao_aal2()
      or (
        not public.is_superadmin()
        and not coalesce((select o.exigir_2fa from public.orgaos o where o.id = p_orgao), true)
      );
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

create function public.tocar_atualizado_em()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger orgaos_atualizado before update on public.orgaos
  for each row execute function public.tocar_atualizado_em();
create trigger usuarios_atualizado before update on public.usuarios
  for each row execute function public.tocar_atualizado_em();
create trigger membros_atualizado before update on public.membros
  for each row execute function public.tocar_atualizado_em();

-- Cria o perfil assim que a conta nasce no Supabase Auth.
create function public.criar_perfil_usuario()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.usuarios (id, nome, email)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''), lower(coalesce(new.email, '')));
  return new;
end;
$$;

create trigger ao_criar_usuario after insert on auth.users
  for each row execute function public.criar_perfil_usuario();

-- Contexto da requisição HTTP (preenchido pelo PostgREST).
create function public.cabecalho_requisicao(p_nome text)
returns text
language sql stable set search_path = ''
as $$
  select nullif(current_setting('request.headers', true), '')::json ->> p_nome;
$$;

-- Auditoria genérica: anexar a qualquer tabela que tenha orgao_id (ou à própria orgaos).
create function public.auditar()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_antes jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_depois jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_linha jsonb := coalesce(v_depois, v_antes);
  v_orgao uuid;
  v_registro text;
begin
  if tg_table_name = 'orgaos' then
    v_orgao := (v_linha ->> 'id')::uuid;
  else
    v_orgao := (v_linha ->> 'orgao_id')::uuid;
  end if;

  v_registro := coalesce(
    v_linha ->> 'id',
    concat_ws(':', v_linha ->> 'orgao_id', v_linha ->> 'usuario_id')
  );

  insert into public.auditoria
    (orgao_id, usuario_id, acao, tabela, registro_id, dados_antes, dados_depois, ip, user_agent)
  values (
    v_orgao,
    auth.uid(),
    lower(tg_op),
    tg_table_schema || '.' || tg_table_name,
    v_registro,
    v_antes,
    v_depois,
    split_part(coalesce(public.cabecalho_requisicao('x-forwarded-for'), ''), ',', 1),
    public.cabecalho_requisicao('user-agent')
  );

  return coalesce(new, old);
end;
$$;

create trigger orgaos_auditoria after insert or update or delete on public.orgaos
  for each row execute function public.auditar();
create trigger membros_auditoria after insert or update or delete on public.membros
  for each row execute function public.auditar();

-- Eventos de aplicação (login, exportação, publicação) registrados pelo próprio usuário.
create function public.registrar_evento(p_orgao uuid, p_acao text, p_detalhes jsonb default null)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'não autenticado' using errcode = '42501';
  end if;
  if p_orgao is not null and not public.is_membro(p_orgao) then
    raise exception 'sem acesso a este órgão' using errcode = '42501';
  end if;

  insert into public.auditoria (orgao_id, usuario_id, acao, detalhes, ip, user_agent)
  values (
    p_orgao,
    auth.uid(),
    p_acao,
    p_detalhes,
    split_part(coalesce(public.cabecalho_requisicao('x-forwarded-for'), ''), ',', 1),
    public.cabecalho_requisicao('user-agent')
  );
end;
$$;

-- Vincula uma conta existente ao órgão. Convites de contas novas passam pelo servidor.
create function public.adicionar_membro(p_orgao uuid, p_email text, p_papel public.papel_orgao)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_usuario uuid;
begin
  if not public.tem_papel(p_orgao, array['administrador']::public.papel_orgao[])
     or not public.escrita_liberada(p_orgao) then
    raise exception 'sem permissão para gerenciar usuários deste órgão' using errcode = '42501';
  end if;

  select u.id into v_usuario from public.usuarios u where u.email = lower(trim(p_email));
  if v_usuario is null then
    raise exception 'usuário não encontrado' using errcode = 'P0002';
  end if;

  insert into public.membros (orgao_id, usuario_id, papel)
  values (p_orgao, v_usuario, p_papel)
  on conflict (orgao_id, usuario_id) do update set papel = excluded.papel, ativo = true;

  return v_usuario;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.orgaos enable row level security;
alter table public.usuarios enable row level security;
alter table public.membros enable row level security;
alter table public.auditoria enable row level security;

-- orgaos: dados institucionais são públicos (portal), escrita restrita.
create policy "orgaos ativos são públicos" on public.orgaos
  for select to anon, authenticated
  using (ativo or public.is_membro(id));

create policy "equipe NEXO cria órgãos" on public.orgaos
  for insert to authenticated
  with check (public.is_superadmin() and public.sessao_aal2());

create policy "administrador atualiza o órgão" on public.orgaos
  for update to authenticated
  using (public.tem_papel(id, array['administrador']::public.papel_orgao[]) and public.escrita_liberada(id))
  with check (public.tem_papel(id, array['administrador']::public.papel_orgao[]) and public.escrita_liberada(id));

create policy "equipe NEXO remove órgãos" on public.orgaos
  for delete to authenticated
  using (public.is_superadmin() and public.sessao_aal2());

-- Só a equipe NEXO muda slug, domínio, status ou a exigência de 2FA.
create function public.proteger_campos_orgao()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if not public.is_superadmin() and auth.uid() is not null and (
       new.slug is distinct from old.slug
    or new.dominio is distinct from old.dominio
    or new.ativo is distinct from old.ativo
    or new.exigir_2fa is distinct from old.exigir_2fa
    or new.tipo is distinct from old.tipo
  ) then
    raise exception 'campo reservado à equipe NEXO' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger orgaos_campos_protegidos before update on public.orgaos
  for each row execute function public.proteger_campos_orgao();

-- usuarios: cada um vê o próprio perfil; administradores veem quem está no seu órgão.
create policy "usuário vê o próprio perfil" on public.usuarios
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_superadmin()
    or exists (
      select 1 from public.membros m
      where m.usuario_id = usuarios.id
        and public.tem_papel(m.orgao_id, array['administrador', 'gestor']::public.papel_orgao[])
    )
  );

create policy "usuário edita o próprio perfil" on public.usuarios
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.usuarios from authenticated, anon;
grant update (nome, telefone) on public.usuarios to authenticated;

-- membros
create policy "membros visíveis ao próprio usuário e à gestão do órgão" on public.membros
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.tem_papel(orgao_id, array['administrador', 'gestor']::public.papel_orgao[])
  );

create policy "administrador inclui membros" on public.membros
  for insert to authenticated
  with check (public.tem_papel(orgao_id, array['administrador']::public.papel_orgao[]) and public.escrita_liberada(orgao_id));

create policy "administrador altera membros" on public.membros
  for update to authenticated
  using (public.tem_papel(orgao_id, array['administrador']::public.papel_orgao[]) and public.escrita_liberada(orgao_id))
  with check (public.tem_papel(orgao_id, array['administrador']::public.papel_orgao[]) and public.escrita_liberada(orgao_id));

create policy "administrador remove membros" on public.membros
  for delete to authenticated
  using (
    public.tem_papel(orgao_id, array['administrador']::public.papel_orgao[])
    and public.escrita_liberada(orgao_id)
    and usuario_id <> auth.uid()
  );

-- auditoria: leitura para administradores e equipe NEXO; ninguém escreve direto.
create policy "administrador lê a auditoria do órgão" on public.auditoria
  for select to authenticated
  using (
    public.is_superadmin()
    or (orgao_id is not null and public.tem_papel(orgao_id, array['administrador']::public.papel_orgao[]))
    or usuario_id = auth.uid()
  );

revoke insert, update, delete, truncate on public.auditoria from anon, authenticated;

-- Imutável mesmo para o service_role: bloqueia UPDATE e DELETE por gatilho.
create function public.auditoria_imutavel()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  raise exception 'a trilha de auditoria é imutável' using errcode = '42501';
end;
$$;

create trigger auditoria_sem_alteracao before update or delete on public.auditoria
  for each row execute function public.auditoria_imutavel();

-- Funções internas não devem ser chamadas pela API.
revoke execute on function public.auditar() from public, anon, authenticated;
revoke execute on function public.criar_perfil_usuario() from public, anon, authenticated;
revoke execute on function public.adicionar_membro(uuid, text, public.papel_orgao) from public, anon;
revoke execute on function public.registrar_evento(uuid, text, jsonb) from public, anon;
grant execute on function public.adicionar_membro(uuid, text, public.papel_orgao) to authenticated;
grant execute on function public.registrar_evento(uuid, text, jsonb) to authenticated;

create unique index usuarios_email_idx on public.usuarios (email) where email <> '';
