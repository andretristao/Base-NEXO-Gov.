-- NEXO Gov · Módulo Protocolo e Processo Legislativo
-- Documentos protocolados (ofícios, proposições, atos, atas) com numeração
-- automática, tramitação por setores e etapas configuráveis por órgão,
-- sessões plenárias com pauta em fases e anexos no Storage.

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------

-- administrativo: ofício, memorando · proposicao: projeto de lei, requerimento
-- ato: decreto, portaria, resolução · ata: ata de sessão
create type public.categoria_documento as enum ('administrativo', 'proposicao', 'ato', 'ata');

-- andamento: etapa intermediária · conclusao: publica o documento (se o tipo for público)
-- arquivamento: encerra sem publicar
create type public.natureza_etapa as enum ('andamento', 'conclusao', 'arquivamento');

create type public.tipo_sessao as enum ('ordinaria', 'extraordinaria', 'solene', 'especial');

create type public.situacao_sessao as enum ('agendada', 'realizada', 'cancelada');

-- ---------------------------------------------------------------------------
-- Configuração por órgão (tudo editável no painel)
-- ---------------------------------------------------------------------------

create table public.setores (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  sigla text not null check (length(trim(sigla)) > 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (orgao_id, sigla)
);

create table public.fluxos (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  descricao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (orgao_id, nome)
);

create table public.etapas (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  fluxo_id uuid not null references public.fluxos (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  ordem int not null default 0,
  natureza public.natureza_etapa not null default 'andamento',
  -- setor responsável por padrão quando o documento chega nesta etapa
  setor_id uuid references public.setores (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index etapas_fluxo_idx on public.etapas (fluxo_id, ordem);

create table public.tipos_documento (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  sigla text not null check (length(trim(sigla)) > 0),
  categoria public.categoria_documento not null,
  fluxo_id uuid not null references public.fluxos (id),
  -- documentos concluídos deste tipo aparecem no portal
  publico boolean not null default true,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (orgao_id, sigla)
);

-- Fases da pauta de sessão: Expediente, Tribuna Livre, Ordem do Dia...
create table public.fases_sessao (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  ordem int not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- Numeração sequencial por órgão, chave e ano. Só funções internas escrevem.
create table public.contadores (
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  chave text not null,
  ano int not null,
  ultimo int not null default 0,
  primary key (orgao_id, chave, ano)
);

-- ---------------------------------------------------------------------------
-- Documentos e tramitação
-- ---------------------------------------------------------------------------

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  tipo_id uuid not null references public.tipos_documento (id),
  -- protocolo geral do órgão: AAAA/NNNNNN; número próprio do tipo no ano
  protocolo text not null,
  ano int not null,
  numero int not null,
  assunto text not null check (length(trim(assunto)) > 0),
  interessado text,
  texto text,
  etapa_id uuid not null references public.etapas (id),
  setor_id uuid references public.setores (id) on delete set null,
  criado_por uuid references public.usuarios (id) on delete set null,
  publicado_em timestamptz,
  arquivado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (orgao_id, protocolo),
  unique (tipo_id, ano, numero)
);

create index documentos_orgao_idx on public.documentos (orgao_id, criado_em desc);
create index documentos_etapa_idx on public.documentos (etapa_id);
create index documentos_publicados_idx on public.documentos (orgao_id, publicado_em desc) where publicado_em is not null;

comment on table public.documentos is 'Documentos protocolados. Etapa e setor só mudam por tramitar_documento().';

-- Histórico de movimentações. Append-only: ninguém altera nem apaga.
create table public.tramitacoes (
  id bigint generated always as identity primary key,
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  documento_id uuid not null references public.documentos (id) on delete cascade,
  etapa_origem_id uuid references public.etapas (id) on delete set null,
  etapa_destino_id uuid references public.etapas (id) on delete set null,
  setor_destino_id uuid references public.setores (id) on delete set null,
  -- nomes congelados: o histórico não muda se a configuração for renomeada
  etapa_nome text not null,
  setor_nome text,
  despacho text,
  usuario_id uuid references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index tramitacoes_documento_idx on public.tramitacoes (documento_id, id);

create table public.anexos (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  documento_id uuid not null references public.documentos (id) on delete cascade,
  nome_arquivo text not null,
  -- caminho no bucket "protocolo": <orgao_id>/<documento_id>/<arquivo>
  caminho text not null unique,
  tipo_mime text,
  tamanho bigint,
  criado_por uuid references public.usuarios (id) on delete set null,
  criado_em timestamptz not null default now()
);

create index anexos_documento_idx on public.anexos (documento_id);

-- ---------------------------------------------------------------------------
-- Sessões plenárias
-- ---------------------------------------------------------------------------

create table public.sessoes (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  tipo public.tipo_sessao not null,
  numero int not null,
  ano int not null,
  data_hora timestamptz not null,
  local text,
  situacao public.situacao_sessao not null default 'agendada',
  observacoes text,
  ata_documento_id uuid references public.documentos (id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (orgao_id, tipo, ano, numero)
);

create index sessoes_orgao_idx on public.sessoes (orgao_id, data_hora desc);

create table public.pauta_itens (
  id uuid primary key default gen_random_uuid(),
  orgao_id uuid not null references public.orgaos (id) on delete cascade,
  sessao_id uuid not null references public.sessoes (id) on delete cascade,
  fase_id uuid not null references public.fases_sessao (id),
  ordem int not null default 0,
  documento_id uuid references public.documentos (id) on delete set null,
  descricao text not null check (length(trim(descricao)) > 0),
  resultado text check (resultado in ('lido', 'aprovado', 'rejeitado', 'adiado', 'retirado', 'vista')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index pauta_sessao_idx on public.pauta_itens (sessao_id, ordem);

-- ---------------------------------------------------------------------------
-- Funções de apoio
-- ---------------------------------------------------------------------------

-- Configuração e sessões de órgãos ativos são informação pública.
create function public.orgao_publico(p_orgao uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select o.ativo from public.orgaos o where o.id = p_orgao), false)
      or public.is_membro(p_orgao);
$$;

create function public.pode_editar(p_orgao uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.tem_papel(p_orgao, array['administrador', 'gestor', 'editor']::public.papel_orgao[])
     and public.escrita_liberada(p_orgao);
$$;

create function public.pode_configurar(p_orgao uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select public.tem_papel(p_orgao, array['administrador']::public.papel_orgao[])
     and public.escrita_liberada(p_orgao);
$$;

create function public.documento_publico(p_documento uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.documentos d
    join public.tipos_documento t on t.id = d.tipo_id
    join public.orgaos o on o.id = d.orgao_id
    where d.id = p_documento and d.publicado_em is not null and t.publico and o.ativo
  );
$$;

create function public.proximo_numero(p_orgao uuid, p_chave text, p_ano int)
returns int
language sql volatile security definer set search_path = ''
as $$
  insert into public.contadores (orgao_id, chave, ano, ultimo)
  values (p_orgao, p_chave, p_ano, 1)
  on conflict (orgao_id, chave, ano) do update set ultimo = public.contadores.ultimo + 1
  returning ultimo;
$$;

-- ---------------------------------------------------------------------------
-- Gatilhos de documentos
-- ---------------------------------------------------------------------------

-- Numera, coloca na primeira etapa do fluxo e registra o autor. Ignora o que o cliente enviar.
create function public.preparar_documento()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  v_tipo public.tipos_documento;
  v_etapa public.etapas;
begin
  select * into v_tipo from public.tipos_documento where id = new.tipo_id;
  if v_tipo.id is null or v_tipo.orgao_id <> new.orgao_id then
    raise exception 'tipo de documento inválido para este órgão' using errcode = '23514';
  end if;
  if not v_tipo.ativo then
    raise exception 'tipo de documento inativo' using errcode = '23514';
  end if;

  select * into v_etapa from public.etapas
  where fluxo_id = v_tipo.fluxo_id
  order by ordem, criado_em
  limit 1;
  if v_etapa.id is null then
    raise exception 'o fluxo deste tipo não tem etapas' using errcode = '23514';
  end if;

  new.ano := extract(year from now() at time zone 'America/Sao_Paulo')::int;
  new.protocolo := new.ano || '/' || lpad(public.proximo_numero(new.orgao_id, 'protocolo', new.ano)::text, 6, '0');
  new.numero := public.proximo_numero(new.orgao_id, 'tipo:' || v_tipo.id, new.ano);
  new.etapa_id := v_etapa.id;
  new.setor_id := v_etapa.setor_id;
  new.criado_por := auth.uid();
  new.publicado_em := null;
  new.arquivado_em := null;
  return new;
end;
$$;

create trigger documentos_preparar before insert on public.documentos
  for each row execute function public.preparar_documento();

create function public.registrar_criacao_documento()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.tramitacoes
    (orgao_id, documento_id, etapa_destino_id, setor_destino_id, etapa_nome, setor_nome, despacho, usuario_id)
  select new.orgao_id, new.id, e.id, s.id, e.nome, s.nome, 'Documento protocolado', auth.uid()
  from public.etapas e
  left join public.setores s on s.id = new.setor_id
  where e.id = new.etapa_id;
  return new;
end;
$$;

create trigger documentos_criacao after insert on public.documentos
  for each row execute function public.registrar_criacao_documento();

-- Move o documento para outra etapa do mesmo fluxo, com despacho.
-- Publicar (etapa de conclusão) exige gestor ou administrador.
create function public.tramitar_documento(
  p_documento uuid,
  p_etapa uuid,
  p_setor uuid default null,
  p_despacho text default null
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_doc public.documentos;
  v_fluxo uuid;
  v_etapa public.etapas;
  v_setor public.setores;
  -- auth.uid() nulo só acontece com service role (seed); anon não tem execute
  v_sistema boolean := auth.uid() is null;
begin
  select * into v_doc from public.documentos where id = p_documento for update;
  if v_doc.id is null or not (v_sistema or public.pode_editar(v_doc.orgao_id)) then
    raise exception 'sem permissão para tramitar este documento' using errcode = '42501';
  end if;

  select fluxo_id into v_fluxo from public.tipos_documento where id = v_doc.tipo_id;
  select * into v_etapa from public.etapas where id = p_etapa;
  if v_etapa.id is null or v_etapa.fluxo_id <> v_fluxo then
    raise exception 'etapa não pertence ao fluxo deste documento' using errcode = '23514';
  end if;
  if v_etapa.id = v_doc.etapa_id and p_setor is not distinct from v_doc.setor_id then
    raise exception 'o documento já está nesta etapa' using errcode = '23514';
  end if;
  if v_doc.arquivado_em is not null then
    raise exception 'documento arquivado não tramita' using errcode = '23514';
  end if;
  if v_doc.publicado_em is not null and v_etapa.natureza <> 'arquivamento' then
    raise exception 'documento publicado só pode ser arquivado' using errcode = '23514';
  end if;
  if v_etapa.natureza = 'conclusao' and not v_sistema
     and not public.tem_papel(v_doc.orgao_id, array['administrador', 'gestor']::public.papel_orgao[]) then
    raise exception 'somente gestor ou administrador publica documentos' using errcode = '42501';
  end if;

  select * into v_setor from public.setores
  where id = coalesce(p_setor, v_etapa.setor_id) and orgao_id = v_doc.orgao_id;
  if p_setor is not null and v_setor.id is null then
    raise exception 'setor inválido' using errcode = '23514';
  end if;

  perform set_config('nexo.tramitando', 'sim', true);
  update public.documentos
  set etapa_id = v_etapa.id,
      setor_id = v_setor.id,
      publicado_em = case when v_etapa.natureza = 'conclusao' then now() else publicado_em end,
      arquivado_em = case when v_etapa.natureza = 'arquivamento' then now() else arquivado_em end
  where id = v_doc.id;
  perform set_config('nexo.tramitando', '', true);

  insert into public.tramitacoes
    (orgao_id, documento_id, etapa_origem_id, etapa_destino_id, setor_destino_id, etapa_nome, setor_nome, despacho, usuario_id)
  values
    (v_doc.orgao_id, v_doc.id, v_doc.etapa_id, v_etapa.id, v_setor.id, v_etapa.nome, v_setor.nome,
     nullif(trim(p_despacho), ''), auth.uid());
end;
$$;

-- Fora de tramitar_documento(), numeração, etapa e publicação não mudam,
-- e documento publicado ou arquivado não é editado.
create function public.proteger_documento()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if coalesce(current_setting('nexo.tramitando', true), '') = 'sim' then
    return new;
  end if;
  if new.protocolo is distinct from old.protocolo
     or new.numero is distinct from old.numero
     or new.ano is distinct from old.ano
     or new.tipo_id is distinct from old.tipo_id
     or new.orgao_id is distinct from old.orgao_id
     or new.etapa_id is distinct from old.etapa_id
     or new.setor_id is distinct from old.setor_id
     or new.publicado_em is distinct from old.publicado_em
     or new.arquivado_em is distinct from old.arquivado_em
     or new.criado_por is distinct from old.criado_por then
    raise exception 'use a tramitação para mudar etapa, setor ou publicação' using errcode = '42501';
  end if;
  if old.publicado_em is not null or old.arquivado_em is not null then
    raise exception 'documento publicado ou arquivado não pode ser editado' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger documentos_protegidos before update on public.documentos
  for each row execute function public.proteger_documento();

create function public.proteger_exclusao_documento()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- a exclusão do órgão inteiro (equipe NEXO) leva os documentos junto
  if old.publicado_em is not null and exists (select 1 from public.orgaos where id = old.orgao_id) then
    raise exception 'documento publicado não pode ser excluído; arquive-o' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger documentos_sem_exclusao_publicado before delete on public.documentos
  for each row execute function public.proteger_exclusao_documento();

create function public.tramitacao_imutavel()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  -- a exclusão em cascata do documento ou do órgão continua permitida
  if tg_op = 'DELETE' and not exists (select 1 from public.documentos where id = old.documento_id) then
    return old;
  end if;
  raise exception 'o histórico de tramitação é imutável' using errcode = '42501';
end;
$$;

create trigger tramitacoes_sem_alteracao before update or delete on public.tramitacoes
  for each row execute function public.tramitacao_imutavel();

-- ---------------------------------------------------------------------------
-- Gatilhos de configuração e sessões
-- ---------------------------------------------------------------------------

-- Referências cruzadas sempre dentro do mesmo órgão.
create function public.conferir_mesmo_orgao()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if tg_table_name = 'etapas' then
    if not exists (select 1 from public.fluxos where id = new.fluxo_id and orgao_id = new.orgao_id)
       or (new.setor_id is not null
           and not exists (select 1 from public.setores where id = new.setor_id and orgao_id = new.orgao_id)) then
      raise exception 'fluxo ou setor de outro órgão' using errcode = '23514';
    end if;
  elsif tg_table_name = 'tipos_documento' then
    if not exists (select 1 from public.fluxos where id = new.fluxo_id and orgao_id = new.orgao_id) then
      raise exception 'fluxo de outro órgão' using errcode = '23514';
    end if;
  elsif tg_table_name = 'pauta_itens' then
    if not exists (select 1 from public.sessoes where id = new.sessao_id and orgao_id = new.orgao_id)
       or not exists (select 1 from public.fases_sessao where id = new.fase_id and orgao_id = new.orgao_id)
       or (new.documento_id is not null
           and not exists (select 1 from public.documentos where id = new.documento_id and orgao_id = new.orgao_id)) then
      raise exception 'sessão, fase ou documento de outro órgão' using errcode = '23514';
    end if;
  elsif tg_table_name = 'sessoes' then
    if new.ata_documento_id is not null
       and not exists (select 1 from public.documentos where id = new.ata_documento_id and orgao_id = new.orgao_id) then
      raise exception 'ata de outro órgão' using errcode = '23514';
    end if;
  elsif tg_table_name = 'anexos' then
    if not exists (select 1 from public.documentos where id = new.documento_id and orgao_id = new.orgao_id)
       or new.caminho not like new.orgao_id || '/' || new.documento_id || '/%' then
      raise exception 'anexo fora da pasta do documento' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger etapas_mesmo_orgao before insert or update on public.etapas
  for each row execute function public.conferir_mesmo_orgao();
create trigger tipos_mesmo_orgao before insert or update on public.tipos_documento
  for each row execute function public.conferir_mesmo_orgao();
create trigger pauta_mesmo_orgao before insert or update on public.pauta_itens
  for each row execute function public.conferir_mesmo_orgao();
create trigger sessoes_mesmo_orgao before insert or update on public.sessoes
  for each row execute function public.conferir_mesmo_orgao();
create trigger anexos_mesmo_orgao before insert or update on public.anexos
  for each row execute function public.conferir_mesmo_orgao();

create function public.numerar_sessao()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  new.ano := extract(year from new.data_hora at time zone 'America/Sao_Paulo')::int;
  new.numero := public.proximo_numero(new.orgao_id, 'sessao:' || new.tipo, new.ano);
  return new;
end;
$$;

create trigger sessoes_numerar before insert on public.sessoes
  for each row execute function public.numerar_sessao();

create function public.proteger_sessao()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.numero is distinct from old.numero or new.ano is distinct from old.ano
     or new.tipo is distinct from old.tipo or new.orgao_id is distinct from old.orgao_id then
    raise exception 'número e tipo da sessão não mudam; cancele e crie outra' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger sessoes_protegidas before update on public.sessoes
  for each row execute function public.proteger_sessao();

do $$
declare
  t text;
begin
  foreach t in array array['setores', 'fluxos', 'etapas', 'tipos_documento', 'fases_sessao', 'documentos', 'sessoes', 'pauta_itens'] loop
    execute format('create trigger %1$s_atualizado before update on public.%1$s for each row execute function public.tocar_atualizado_em()', t);
  end loop;
  foreach t in array array['setores', 'fluxos', 'etapas', 'tipos_documento', 'fases_sessao', 'documentos', 'tramitacoes', 'anexos', 'sessoes', 'pauta_itens'] loop
    execute format('create trigger %1$s_auditoria after insert or update or delete on public.%1$s for each row execute function public.auditar()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Consulta pública de protocolo. Sem despachos nem interessado, e o assunto
-- só aparece se o documento for público (LGPD: ofícios podem ter dados pessoais).
-- ---------------------------------------------------------------------------

create function public.consultar_protocolo(p_orgao uuid, p_protocolo text)
returns jsonb
language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object(
    'id', case when public.documento_publico(d.id) then d.id end,
    'protocolo', d.protocolo,
    'tipo', t.nome,
    'sigla', t.sigla,
    'numero', d.numero,
    'ano', d.ano,
    'assunto', case when public.documento_publico(d.id) then d.assunto end,
    'etapa', e.nome,
    'setor', s.nome,
    'criado_em', d.criado_em,
    'publicado_em', d.publicado_em,
    'arquivado_em', d.arquivado_em,
    'movimentacoes', (
      select coalesce(jsonb_agg(jsonb_build_object('data', m.criado_em, 'etapa', m.etapa_nome, 'setor', m.setor_nome) order by m.id), '[]')
      from public.tramitacoes m where m.documento_id = d.id
    )
  )
  from public.documentos d
  join public.tipos_documento t on t.id = d.tipo_id
  join public.etapas e on e.id = d.etapa_id
  join public.orgaos o on o.id = d.orgao_id
  left join public.setores s on s.id = d.setor_id
  where d.orgao_id = p_orgao
    and o.ativo
    and d.protocolo = trim(p_protocolo);
$$;

-- ---------------------------------------------------------------------------
-- Modelo padrão (um clique no painel). Câmara ganha fluxo legislativo.
-- ---------------------------------------------------------------------------

create function public.configurar_protocolo_padrao(p_orgao uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_tipo public.tipo_orgao;
  v_adm uuid;
  v_leg uuid;
  v_ata uuid;
  s_prot uuid; s_sec uuid; s_jur uuid; s_pres uuid; s_com uuid; s_plen uuid; s_gab uuid; s_adm uuid;
begin
  -- auth.uid() nulo só acontece com service role (seed); anon não tem execute
  if auth.uid() is not null and not public.pode_configurar(p_orgao) then
    raise exception 'sem permissão para configurar este órgão' using errcode = '42501';
  end if;
  select tipo into v_tipo from public.orgaos where id = p_orgao;
  if v_tipo is null then
    raise exception 'órgão não encontrado' using errcode = 'P0002';
  end if;
  if exists (select 1 from public.tipos_documento where orgao_id = p_orgao) then
    raise exception 'o órgão já tem tipos de documento configurados' using errcode = '23505';
  end if;

  if v_tipo = 'camara' then
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Protocolo', 'PROT') returning id into s_prot;
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Secretaria Legislativa', 'SL') returning id into s_sec;
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Procuradoria Jurídica', 'PJ') returning id into s_jur;
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Comissões Permanentes', 'COM') returning id into s_com;
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Presidência', 'PRES') returning id into s_pres;
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Plenário', 'PLEN') returning id into s_plen;

    insert into public.fluxos (orgao_id, nome, descricao)
    values (p_orgao, 'Administrativo', 'Ofícios, memorandos e atos da Mesa') returning id into v_adm;
    insert into public.etapas (orgao_id, fluxo_id, nome, ordem, natureza, setor_id) values
      (p_orgao, v_adm, 'Criado', 1, 'andamento', s_prot),
      (p_orgao, v_adm, 'Em análise', 2, 'andamento', s_sec),
      (p_orgao, v_adm, 'Assinatura', 3, 'andamento', s_pres),
      (p_orgao, v_adm, 'Expedido', 4, 'conclusao', s_sec),
      (p_orgao, v_adm, 'Arquivado', 5, 'arquivamento', s_prot);

    insert into public.fluxos (orgao_id, nome, descricao)
    values (p_orgao, 'Legislativo', 'Projetos, requerimentos, indicações e moções') returning id into v_leg;
    insert into public.etapas (orgao_id, fluxo_id, nome, ordem, natureza, setor_id) values
      (p_orgao, v_leg, 'Protocolado', 1, 'andamento', s_prot),
      (p_orgao, v_leg, 'Leitura no Expediente', 2, 'andamento', s_sec),
      (p_orgao, v_leg, 'Parecer jurídico', 3, 'andamento', s_jur),
      (p_orgao, v_leg, 'Comissões', 4, 'andamento', s_com),
      (p_orgao, v_leg, 'Ordem do Dia', 5, 'andamento', s_plen),
      (p_orgao, v_leg, 'Aprovado e publicado', 6, 'conclusao', s_sec),
      (p_orgao, v_leg, 'Arquivado', 7, 'arquivamento', s_prot);

    insert into public.fluxos (orgao_id, nome, descricao)
    values (p_orgao, 'Atas', 'Atas das sessões plenárias') returning id into v_ata;
    insert into public.etapas (orgao_id, fluxo_id, nome, ordem, natureza, setor_id) values
      (p_orgao, v_ata, 'Criada', 1, 'andamento', s_sec),
      (p_orgao, v_ata, 'Análise', 2, 'andamento', s_pres),
      (p_orgao, v_ata, 'Secretaria', 3, 'andamento', s_sec),
      (p_orgao, v_ata, 'Jurídico', 4, 'andamento', s_jur),
      (p_orgao, v_ata, 'Publicada', 5, 'conclusao', s_sec);

    insert into public.tipos_documento (orgao_id, nome, sigla, categoria, fluxo_id, publico) values
      (p_orgao, 'Ofício', 'OF', 'administrativo', v_adm, false),
      (p_orgao, 'Memorando', 'MEM', 'administrativo', v_adm, false),
      (p_orgao, 'Decreto Administrativo', 'DA', 'ato', v_adm, true),
      (p_orgao, 'Projeto de Lei', 'PL', 'proposicao', v_leg, true),
      (p_orgao, 'Projeto de Decreto Legislativo', 'PDL', 'proposicao', v_leg, true),
      (p_orgao, 'Projeto de Resolução', 'PR', 'proposicao', v_leg, true),
      (p_orgao, 'Requerimento', 'REQ', 'proposicao', v_leg, true),
      (p_orgao, 'Indicação', 'IND', 'proposicao', v_leg, true),
      (p_orgao, 'Moção', 'MOC', 'proposicao', v_leg, true),
      (p_orgao, 'Ata de Sessão', 'ATA', 'ata', v_ata, true);

    insert into public.fases_sessao (orgao_id, nome, ordem) values
      (p_orgao, 'Expediente', 1),
      (p_orgao, 'Tribuna Livre', 2),
      (p_orgao, 'Ordem do Dia', 3),
      (p_orgao, 'Explicações Pessoais', 4);
  else
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Protocolo Geral', 'PROT') returning id into s_prot;
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Gabinete', 'GAB') returning id into s_gab;
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Procuradoria Jurídica', 'PJ') returning id into s_jur;
    insert into public.setores (orgao_id, nome, sigla) values (p_orgao, 'Secretaria de Administração', 'SAD') returning id into s_adm;

    insert into public.fluxos (orgao_id, nome, descricao)
    values (p_orgao, 'Administrativo', 'Ofícios, memorandos, decretos e portarias') returning id into v_adm;
    insert into public.etapas (orgao_id, fluxo_id, nome, ordem, natureza, setor_id) values
      (p_orgao, v_adm, 'Criado', 1, 'andamento', s_prot),
      (p_orgao, v_adm, 'Em análise', 2, 'andamento', s_adm),
      (p_orgao, v_adm, 'Jurídico', 3, 'andamento', s_jur),
      (p_orgao, v_adm, 'Assinatura', 4, 'andamento', s_gab),
      (p_orgao, v_adm, 'Publicado', 5, 'conclusao', s_gab),
      (p_orgao, v_adm, 'Arquivado', 6, 'arquivamento', s_prot);

    insert into public.tipos_documento (orgao_id, nome, sigla, categoria, fluxo_id, publico) values
      (p_orgao, 'Ofício', 'OF', 'administrativo', v_adm, false),
      (p_orgao, 'Memorando', 'MEM', 'administrativo', v_adm, false),
      (p_orgao, 'Decreto', 'DEC', 'ato', v_adm, true),
      (p_orgao, 'Portaria', 'PORT', 'ato', v_adm, true);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.setores enable row level security;
alter table public.fluxos enable row level security;
alter table public.etapas enable row level security;
alter table public.tipos_documento enable row level security;
alter table public.fases_sessao enable row level security;
alter table public.contadores enable row level security;
alter table public.documentos enable row level security;
alter table public.tramitacoes enable row level security;
alter table public.anexos enable row level security;
alter table public.sessoes enable row level security;
alter table public.pauta_itens enable row level security;

-- Configuração: leitura pública (nomes de etapas e setores aparecem no portal),
-- escrita só do administrador com 2FA.
do $$
declare
  t text;
begin
  foreach t in array array['setores', 'fluxos', 'etapas', 'tipos_documento', 'fases_sessao'] loop
    execute format('create policy "configuração visível" on public.%I for select to anon, authenticated using (public.orgao_publico(orgao_id))', t);
    execute format('create policy "administrador inclui" on public.%I for insert to authenticated with check (public.pode_configurar(orgao_id))', t);
    execute format('create policy "administrador altera" on public.%I for update to authenticated using (public.pode_configurar(orgao_id)) with check (public.pode_configurar(orgao_id))', t);
    execute format('create policy "administrador remove" on public.%I for delete to authenticated using (public.pode_configurar(orgao_id))', t);
  end loop;
end $$;

-- contadores: sem políticas; só funções security definer escrevem.
revoke all on public.contadores from anon, authenticated;

-- documentos
create policy "membros e público veem documentos" on public.documentos
  for select to anon, authenticated
  using (public.is_membro(orgao_id) or public.documento_publico(id));

create policy "editor protocola documentos" on public.documentos
  for insert to authenticated
  with check (public.pode_editar(orgao_id));

create policy "editor altera documentos em tramitação" on public.documentos
  for update to authenticated
  using (public.pode_editar(orgao_id))
  with check (public.pode_editar(orgao_id));

create policy "administrador exclui documentos não publicados" on public.documentos
  for delete to authenticated
  using (public.pode_configurar(orgao_id));

revoke update on public.documentos from anon, authenticated;
grant update (assunto, interessado, texto) on public.documentos to authenticated;

-- tramitacoes: leitura interna; inclusão só por tramitar_documento()
create policy "membros veem a tramitação" on public.tramitacoes
  for select to authenticated
  using (public.is_membro(orgao_id));

revoke insert, update, delete, truncate on public.tramitacoes from anon, authenticated;

-- anexos
create policy "membros e público veem anexos" on public.anexos
  for select to anon, authenticated
  using (public.is_membro(orgao_id) or public.documento_publico(documento_id));

create policy "editor anexa arquivos" on public.anexos
  for insert to authenticated
  with check (
    public.pode_editar(orgao_id)
    and exists (select 1 from public.documentos d where d.id = documento_id and d.publicado_em is null and d.arquivado_em is null)
  );

create policy "editor remove anexos de documento em tramitação" on public.anexos
  for delete to authenticated
  using (
    public.pode_editar(orgao_id)
    and exists (select 1 from public.documentos d where d.id = documento_id and d.publicado_em is null and d.arquivado_em is null)
  );

revoke update on public.anexos from anon, authenticated;

-- sessões e pauta: públicas; escrita por editor, gestor ou administrador
create policy "sessões são públicas" on public.sessoes
  for select to anon, authenticated
  using (public.orgao_publico(orgao_id));
create policy "editor agenda sessões" on public.sessoes
  for insert to authenticated with check (public.pode_editar(orgao_id));
create policy "editor altera sessões" on public.sessoes
  for update to authenticated using (public.pode_editar(orgao_id)) with check (public.pode_editar(orgao_id));
create policy "administrador exclui sessões" on public.sessoes
  for delete to authenticated using (public.pode_configurar(orgao_id));

create policy "pauta é pública" on public.pauta_itens
  for select to anon, authenticated
  using (public.orgao_publico(orgao_id));
create policy "editor monta a pauta" on public.pauta_itens
  for insert to authenticated with check (public.pode_editar(orgao_id));
create policy "editor altera a pauta" on public.pauta_itens
  for update to authenticated using (public.pode_editar(orgao_id)) with check (public.pode_editar(orgao_id));
create policy "editor remove itens da pauta" on public.pauta_itens
  for delete to authenticated using (public.pode_editar(orgao_id));

-- ---------------------------------------------------------------------------
-- Storage: bucket privado; download por URL assinada conforme as mesmas regras
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('protocolo', 'protocolo', false, 4194304)
on conflict (id) do nothing;

create policy "protocolo: leitura por membros ou documento público" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'protocolo'
    and exists (
      select 1 from public.anexos a
      where a.caminho = name
        and (public.is_membro(a.orgao_id) or public.documento_publico(a.documento_id))
    )
  );

create policy "protocolo: editor envia para documento em tramitação" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'protocolo'
    and exists (
      select 1 from public.documentos d
      where d.orgao_id::text = (storage.foldername(name))[1]
        and d.id::text = (storage.foldername(name))[2]
        and d.publicado_em is null and d.arquivado_em is null
        and public.pode_editar(d.orgao_id)
    )
  );

create policy "protocolo: editor remove de documento em tramitação" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'protocolo'
    and exists (
      select 1 from public.documentos d
      where d.orgao_id::text = (storage.foldername(name))[1]
        and d.id::text = (storage.foldername(name))[2]
        and d.publicado_em is null and d.arquivado_em is null
        and public.pode_editar(d.orgao_id)
    )
  );

-- ---------------------------------------------------------------------------
-- Permissões de funções
-- ---------------------------------------------------------------------------

revoke execute on function public.proximo_numero(uuid, text, int) from public, anon, authenticated;
revoke execute on function public.preparar_documento() from public, anon, authenticated;
revoke execute on function public.registrar_criacao_documento() from public, anon, authenticated;
revoke execute on function public.numerar_sessao() from public, anon, authenticated;
revoke execute on function public.conferir_mesmo_orgao() from public, anon, authenticated;
revoke execute on function public.tramitar_documento(uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.configurar_protocolo_padrao(uuid) from public, anon;
grant execute on function public.tramitar_documento(uuid, uuid, uuid, text) to authenticated, service_role;
grant execute on function public.configurar_protocolo_padrao(uuid) to authenticated, service_role;
grant execute on function public.consultar_protocolo(uuid, text) to anon, authenticated;
