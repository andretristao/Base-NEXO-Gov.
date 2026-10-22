-- Cenários de isolamento entre órgãos, perfis, 2FA (aal2) e auditoria imutável.
-- Cada linha "esperado X" deve bater com o valor impresso; ERROR é esperado onde a ação é proibida.
\set ON_ERROR_STOP 0
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','a@x.br','{"nome":"Ana"}'),
 ('00000000-0000-0000-0000-00000000000b','b@x.br','{}'),
 ('00000000-0000-0000-0000-00000000000c','c@x.br','{}'),
 ('00000000-0000-0000-0000-00000000000d','d@x.br','{}'),
 ('00000000-0000-0000-0000-000000000005','s@x.br','{}');
update public.usuarios set superadmin=true where email='s@x.br';
insert into public.orgaos (id,slug,nome,tipo,uf,municipio) values
 ('10000000-0000-0000-0000-000000000001','pref','Prefeitura','prefeitura','SP','Vila'),
 ('10000000-0000-0000-0000-000000000002','camara','Câmara','camara','SP','Vila'),
 ('10000000-0000-0000-0000-000000000003','inativo','Inativo','camara','SP','Vila');
update public.orgaos set ativo=false where slug='inativo';
insert into public.membros values
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000a','administrador'),
 ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000b','editor'),
 ('10000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-00000000000c','administrador');
select 'nome do perfil vindo do metadata: ' || nome from public.usuarios where email='a@x.br';

\echo '--- anon'
set role anon; set request.jwt.claims = '';
select 'anon vê orgaos ativos (esperado 2): ' || count(*) from public.orgaos;
select 'anon vê membros (esperado erro ou 0): ' || count(*) from public.membros;
reset role;

\echo '--- A aal1'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","aal":"aal1"}';
update public.orgaos set nome='X' where slug='pref';
select 'A aal1 alterou? (esperado Prefeitura): ' || nome from public.orgaos where slug='pref';
\echo '--- A aal2'
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","aal":"aal2"}';
update public.orgaos set nome='Prefeitura de Vila' where slug='pref';
select 'A aal2 alterou (esperado Prefeitura de Vila): ' || nome from public.orgaos where slug='pref';
update public.orgaos set slug='outro' where slug='pref';
update public.orgaos set nome='hack' where slug='camara';
select 'A alterou câmara? (esperado Câmara): ' || nome from public.orgaos where slug='camara';
select 'A vê membros (esperado 2): ' || count(*) from public.membros;
select 'A vê usuarios (esperado 2): ' || count(*) from public.usuarios;
select 'A vê auditoria do órgão (esperado >=1): ' || count(*) from public.auditoria where orgao_id='10000000-0000-0000-0000-000000000001';
select public.adicionar_membro('10000000-0000-0000-0000-000000000001','d@x.br','gestor');
select public.adicionar_membro('10000000-0000-0000-0000-000000000002','d@x.br','gestor');
delete from public.membros where usuario_id='00000000-0000-0000-0000-00000000000a';
select 'A ainda é membro (esperado 1): ' || count(*) from public.membros where usuario_id='00000000-0000-0000-0000-00000000000a';
update public.usuarios set superadmin=true where id=auth.uid();
update public.usuarios set nome='Ana Paula' where id=auth.uid();
insert into public.auditoria(acao) values ('fake');
select public.registrar_evento('10000000-0000-0000-0000-000000000001','login','{"m":"senha+totp"}');
select public.registrar_evento('10000000-0000-0000-0000-000000000002','login',null);
reset role;

\echo '--- B editor aal2'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","aal":"aal2"}';
update public.orgaos set nome='B' where slug='pref';
insert into public.membros values ('10000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-00000000000c','administrador');
select 'B vê membros (esperado 1 = ele mesmo): ' || count(*) from public.membros;
select 'B vê auditoria do órgão (esperado só a dele = 0): ' || count(*) from public.auditoria;
reset role;

\echo '--- C admin câmara'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","aal":"aal2"}';
select 'C vê membros (esperado 1 da câmara): ' || count(*) from public.membros;
select 'C vê auditoria pref (esperado 0): ' || count(*) from public.auditoria where orgao_id='10000000-0000-0000-0000-000000000001';
select 'C vê orgão inativo (esperado 0): ' || count(*) from public.orgaos where slug='inativo';
reset role;

\echo '--- superadmin'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","aal":"aal1"}';
insert into public.orgaos (slug,nome,tipo,uf,municipio) values ('novo','Novo','conselho','SP','Vila');
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000005","aal":"aal2"}';
insert into public.orgaos (slug,nome,tipo,uf,municipio) values ('novo','Novo','conselho','SP','Vila');
update public.orgaos set exigir_2fa=false where slug='novo';
select 'S vê inativo (esperado 1): ' || count(*) from public.orgaos where slug='inativo';
delete from public.orgaos where slug='novo';
reset role;

\echo '--- imutabilidade'
update public.auditoria set acao='x';
delete from public.auditoria;
select tabela, acao, registro_id, orgao_id is not null as tem_orgao from public.auditoria order by id;
