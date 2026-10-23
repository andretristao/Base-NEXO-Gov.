-- NEXO Gov · Módulo Conteúdo
-- Notícias, banners da home e atalhos "mais buscados" do portal, editáveis no painel.
-- Depende de 20261022000001_base_multitenant.sql e 20261023000001_protocolo.sql
-- (orgao_publico, pode_editar, auditar, tocar_atualizado_em).

-- ---------------------------------------------------------------------------
-- Tabelas
-- ---------------------------------------------------------------------------

create table public.noticias (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  resumo text,
  corpo text,
  categoria text,
  -- caminho no bucket "conteudo": <orgao_id>/<arquivo>
  imagem_caminho text,
  imagem_alt text,
  destaque boolean not null default false,
  publicada boolean not null default false,
  -- data exibida no portal; no futuro = agendada (só aparece a partir dela)
  publicado_em timestamptz,
  criado_por uuid references public.usuarios (id) on delete set null default auth.uid(),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  -- imagem informativa precisa de texto alternativo (eMAG 3.6 / WCAG 1.1.1)
  constraint noticias_imagem_com_alt check (imagem_caminho is null or length(trim(coalesce(imagem_alt, ''))) > 0)
);

create index noticias_publicadas_idx on public.noticias (orgao_id, publicado_em desc) where publicada;

comment on table public.noticias is 'Notícias do portal. Rascunho até publicada = true e publicado_em <= agora.';

create table public.banners (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  titulo text not null check (length(trim(titulo)) > 0),
  texto text,
  link_url text,
  link_rotulo text,
  imagem_caminho text,
  imagem_alt text,
  ordem int not null default 0,
  ativo boolean not null default true,
  inicio_em timestamptz,
  fim_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint banners_imagem_com_alt check (imagem_caminho is null or length(trim(coalesce(imagem_alt, ''))) > 0),
  constraint banners_periodo check (fim_em is null or inicio_em is null or fim_em > inicio_em),
  -- só links relativos ao portal ou https
  constraint banners_link check (link_url is null or link_url ~ '^(/|https://)')
);

create index banners_orgao_idx on public.banners (orgao_id, ordem);

comment on table public.banners is 'Destaques da página inicial, com período de exibição opcional.';

create table public.atalhos (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  rotulo text not null check (length(trim(rotulo)) > 0),
  url text not null check (url ~ '^(/|https://)'),
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index atalhos_orgao_idx on public.atalhos (orgao_id, ordem);

comment on table public.atalhos is 'Atalhos "mais buscados" do cabeçalho do portal.';

-- ---------------------------------------------------------------------------
-- Gatilhos
-- ---------------------------------------------------------------------------

-- Ao publicar sem data, a data de publicação é agora.
create function public.preparar_noticia()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.publicada and new.publicado_em is null then
    new.publicado_em := now();
  end if;
  return new;
end;
$$;

create trigger noticias_preparar before insert or update on public.noticias
  for each row execute function public.preparar_noticia();

do $$
declare
  t text;
begin
  foreach t in array array['noticias', 'banners', 'atalhos'] loop
    execute format('create trigger %1$s_atualizado before update on public.%1$s for each row execute function public.tocar_atualizado_em()', t);
    execute format('create trigger %1$s_auditoria after insert or update or delete on public.%1$s for each row execute function public.auditar()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RLS: o público vê o que está no ar; a equipe do órgão vê tudo e edita com 2FA.
-- ---------------------------------------------------------------------------

alter table public.noticias enable row level security;
alter table public.banners enable row level security;
alter table public.atalhos enable row level security;

create policy "notícias publicadas são públicas" on public.noticias
  for select to anon, authenticated
  using (
    public.is_membro(orgao_id)
    or (publicada and publicado_em <= now() and public.orgao_publico(orgao_id))
  );

create policy "banners no ar são públicos" on public.banners
  for select to anon, authenticated
  using (
    public.is_membro(orgao_id)
    or (
      ativo and public.orgao_publico(orgao_id)
      and (inicio_em is null or inicio_em <= now())
      and (fim_em is null or fim_em > now())
    )
  );

create policy "atalhos ativos são públicos" on public.atalhos
  for select to anon, authenticated
  using (public.is_membro(orgao_id) or (ativo and public.orgao_publico(orgao_id)));

do $$
declare
  t text;
begin
  foreach t in array array['noticias', 'banners', 'atalhos'] loop
    execute format('create policy "editor inclui" on public.%I for insert to authenticated with check (public.pode_editar(orgao_id))', t);
    execute format('create policy "editor altera" on public.%I for update to authenticated using (public.pode_editar(orgao_id)) with check (public.pode_editar(orgao_id))', t);
    execute format('create policy "editor remove" on public.%I for delete to authenticated using (public.pode_editar(orgao_id))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Storage: bucket público só de imagens (o portal mostra por URL pública).
-- Nomes de arquivo são aleatórios; não envie aqui documentos com dados pessoais.
-- ---------------------------------------------------------------------------

-- Órgão dono do arquivo pela primeira pasta do caminho; nulo se não for um uuid.
create function public.orgao_da_pasta(p_nome text)
returns uuid
language sql immutable set search_path = ''
as $$
  select case
    when split_part(p_nome, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_nome, '/', 1)::uuid
  end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('conteudo', 'conteudo', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "conteudo: equipe vê os arquivos do órgão" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'conteudo'
    and public.is_membro(public.orgao_da_pasta(name))
  );

create policy "conteudo: editor envia imagens" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'conteudo'
    and public.pode_editar(public.orgao_da_pasta(name))
  );

create policy "conteudo: editor remove imagens" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'conteudo'
    and public.pode_editar(public.orgao_da_pasta(name))
  );

revoke execute on function public.preparar_noticia() from public, anon, authenticated;
