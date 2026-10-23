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

-- ===========================================================================
-- Módulo Protocolo: configuração, numeração, tramitação, publicação e sessões
-- (A admin pref · B editor pref · D gestor pref · C admin câmara)
-- ===========================================================================

\echo '--- protocolo: modelo padrão'
select public.configurar_protocolo_padrao('10000000-0000-0000-0000-000000000002');
select 'câmara: tipos (esperado 10): ' || count(*) from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000002';
select 'câmara: fases (esperado 4): ' || count(*) from public.fases_sessao where orgao_id='10000000-0000-0000-0000-000000000002';
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","aal":"aal2"}';
select public.configurar_protocolo_padrao('10000000-0000-0000-0000-000000000001');
insert into public.setores (orgao_id,nome,sigla) values ('10000000-0000-0000-0000-000000000001','Invasor','INV');
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","aal":"aal1"}';
select public.configurar_protocolo_padrao('10000000-0000-0000-0000-000000000001');
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","aal":"aal2"}';
select public.configurar_protocolo_padrao('10000000-0000-0000-0000-000000000001');
select 'pref: tipos (esperado 4): ' || count(*) from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000001';
select public.configurar_protocolo_padrao('10000000-0000-0000-0000-000000000001');
reset role;
set role anon; set request.jwt.claims = '';
select 'anon vê tipos da câmara (esperado 10): ' || count(*) from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000002';
select 'anon vê contadores (esperado erro): ' || count(*) from public.contadores;
reset role;

\echo '--- protocolo: B editor protocola'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","aal":"aal1"}';
insert into public.documentos (orgao_id,tipo_id,assunto)
  select orgao_id,id,'aal1' from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000001' and sigla='OF';
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","aal":"aal2"}';
insert into public.documentos (orgao_id,tipo_id,assunto,protocolo,numero,ano,etapa_id)
  select orgao_id,id,'Ofício à Câmara','9999/1',99,1999,null from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000001' and sigla='OF';
insert into public.documentos (orgao_id,tipo_id,assunto)
  select orgao_id,id,'Decreto de ponto facultativo' from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000001' and sigla='DEC';
insert into public.documentos (orgao_id,tipo_id,assunto)
  select orgao_id,id,'Segundo ofício' from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000001' and sigla='OF';
select 'protocolos e números (esperado 000001-1, 000002-1, 000003-2): ' || string_agg(right(d.protocolo,6) || '-' || d.numero, ', ' order by d.protocolo)
  from public.documentos d;
select 'etapa inicial (esperado Criado): ' || e.nome from public.documentos d join public.etapas e on e.id=d.etapa_id where d.assunto='Ofício à Câmara';
select 'tramitação de criação (esperado 3): ' || count(*) from public.tramitacoes;
select id as doc_of from public.documentos where assunto='Ofício à Câmara' \gset
select id as doc_dec from public.documentos where assunto='Decreto de ponto facultativo' \gset
select id as doc_of2 from public.documentos where assunto='Segundo ofício' \gset
select e.id as etapa_analise from public.etapas e join public.fluxos f on f.id=e.fluxo_id where f.orgao_id='10000000-0000-0000-0000-000000000001' and e.nome='Em análise' \gset
select e.id as etapa_publicado from public.etapas e join public.fluxos f on f.id=e.fluxo_id where f.orgao_id='10000000-0000-0000-0000-000000000001' and e.nome='Publicado' \gset
select e.id as etapa_arquivado from public.etapas e join public.fluxos f on f.id=e.fluxo_id where f.orgao_id='10000000-0000-0000-0000-000000000001' and e.nome='Arquivado' \gset
update public.documentos set etapa_id=:'etapa_publicado' where id=:'doc_of';
update public.documentos set assunto='Ofício à Câmara Municipal' where id=:'doc_of';
select public.tramitar_documento(:'doc_dec', :'etapa_analise', null, 'Encaminho para análise');
select public.tramitar_documento(:'doc_dec', :'etapa_publicado', null, 'B tenta publicar');
select 'B moveu o decreto (esperado Em análise): ' || e.nome || ' / ' || coalesce(s.sigla,'-') from public.documentos d join public.etapas e on e.id=d.etapa_id left join public.setores s on s.id=d.setor_id where d.id=:'doc_dec';
update public.tramitacoes set despacho='x';
delete from public.tramitacoes;
insert into public.tramitacoes (orgao_id,documento_id,etapa_nome) values ('10000000-0000-0000-0000-000000000001',:'doc_dec','fake');
delete from public.documentos where id=:'doc_of2';
select 'B não exclui (esperado 3): ' || count(*) from public.documentos;
reset role;

\echo '--- protocolo: D gestor publica'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000d","aal":"aal2"}';
select public.tramitar_documento(:'doc_dec', :'etapa_publicado', null, 'Publique-se');
select public.tramitar_documento(:'doc_of', :'etapa_publicado', null, 'Expeça-se');
select 'decreto publicado (esperado t): ' || (publicado_em is not null) from public.documentos where id=:'doc_dec';
update public.documentos set assunto='alterado depois de publicado' where id=:'doc_dec';
select public.tramitar_documento(:'doc_dec', :'etapa_analise', null, 'voltar');
select 'histórico do decreto (esperado 3): ' || count(*) from public.tramitacoes where documento_id=:'doc_dec';
reset role;

\echo '--- protocolo: visão pública'
set role anon; set request.jwt.claims = '';
select 'anon vê documentos publicados e públicos (esperado 1 = decreto): ' || count(*) from public.documentos;
select 'anon vê tramitações (esperado 0): ' || count(*) from public.tramitacoes;
reset role;
select protocolo as prot_of from public.documentos where id=:'doc_of' \gset
set role anon; set request.jwt.claims = '';
select 'consulta pública do ofício (esperado Publicado id=nulo movs=2 despacho=false): '
  || (r->>'etapa') || ' id=' || coalesce(r->>'id','nulo') || ' movs=' || jsonb_array_length(r->'movimentacoes')
  || ' despacho=' || (r::text like '%Expeça%')
  from (select public.consultar_protocolo('10000000-0000-0000-0000-000000000001', :'prot_of') r) z;
select 'consulta em outro órgão (esperado nulo): ' || coalesce(public.consultar_protocolo('10000000-0000-0000-0000-000000000002', :'prot_of')::text, 'nulo');
select public.tramitar_documento(:'doc_dec', :'etapa_arquivado', null, 'anon');
reset role;

\echo '--- protocolo: isolamento entre órgãos'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","aal":"aal2"}';
select 'C vê documentos da pref não públicos (esperado 1 = só o decreto): ' || count(*) from public.documentos where orgao_id='10000000-0000-0000-0000-000000000001';
select public.tramitar_documento(:'doc_of2', :'etapa_analise', null, 'C invade');
insert into public.documentos (orgao_id,tipo_id,assunto)
  select '10000000-0000-0000-0000-000000000002',id,'tipo de outro órgão' from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000001' and sigla='OF';
reset role;

\echo '--- protocolo: exclusão'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","aal":"aal2"}';
delete from public.documentos where id=:'doc_dec';
delete from public.documentos where id=:'doc_of2';
select 'A excluiu o não publicado e manteve o publicado (esperado 2): ' || count(*) from public.documentos where orgao_id='10000000-0000-0000-0000-000000000001';
select public.tramitar_documento(:'doc_dec', :'etapa_arquivado', null, 'Arquive-se');
select 'decreto arquivado continua público (esperado t t): ' || (arquivado_em is not null) || ' ' || public.documento_publico(id) from public.documentos where id=:'doc_dec';
reset role;

\echo '--- protocolo: anexos no storage'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","aal":"aal2"}';
insert into public.documentos (orgao_id,tipo_id,assunto)
  select orgao_id,id,'Ofício com anexo' from public.tipos_documento where orgao_id='10000000-0000-0000-0000-000000000001' and sigla='OF';
select id as doc_anx from public.documentos where assunto='Ofício com anexo' \gset
insert into storage.objects (bucket_id,name) values ('protocolo', '10000000-0000-0000-0000-000000000001/' || :'doc_anx' || '/oficio.pdf');
insert into public.anexos (orgao_id,documento_id,nome_arquivo,caminho) values ('10000000-0000-0000-0000-000000000001',:'doc_anx','oficio.pdf','10000000-0000-0000-0000-000000000001/' || :'doc_anx' || '/oficio.pdf');
insert into storage.objects (bucket_id,name) values ('protocolo', '10000000-0000-0000-0000-000000000001/' || :'doc_dec' || '/depois.pdf');
insert into storage.objects (bucket_id,name) values ('protocolo', '10000000-0000-0000-0000-000000000002/' || :'doc_anx' || '/errado.pdf');
insert into public.anexos (orgao_id,documento_id,nome_arquivo,caminho) values ('10000000-0000-0000-0000-000000000001',:'doc_anx','x.pdf','outra/pasta/x.pdf');
select 'B vê o arquivo (esperado 1): ' || count(*) from storage.objects;
reset role;
set role anon; set request.jwt.claims = '';
select 'anon vê arquivo de documento não publicado (esperado 0): ' || count(*) from storage.objects;
reset role;
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","aal":"aal2"}';
select 'C vê anexos da pref (esperado 0): ' || count(*) from public.anexos;
reset role;

\echo '--- protocolo: sessões'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","aal":"aal2"}';
insert into public.sessoes (orgao_id,tipo,data_hora,local) values
 ('10000000-0000-0000-0000-000000000002','ordinaria','2026-03-02 19:00-03','Plenário'),
 ('10000000-0000-0000-0000-000000000002','ordinaria','2026-03-09 19:00-03','Plenário'),
 ('10000000-0000-0000-0000-000000000002','extraordinaria','2026-03-10 10:00-03','Plenário');
select 'numeração das sessões (esperado ordinaria 1, ordinaria 2, extraordinaria 1): ' || string_agg(tipo || ' ' || numero, ', ' order by data_hora) from public.sessoes;
select id as sessao1 from public.sessoes where numero=1 and tipo='ordinaria' \gset
update public.sessoes set numero=7 where id=:'sessao1';
insert into public.pauta_itens (orgao_id,sessao_id,fase_id,descricao)
  select '10000000-0000-0000-0000-000000000002',:'sessao1',id,'Leitura de correspondências' from public.fases_sessao where orgao_id='10000000-0000-0000-0000-000000000002' and nome='Expediente';
insert into public.pauta_itens (orgao_id,sessao_id,fase_id,descricao,documento_id)
  select '10000000-0000-0000-0000-000000000002',:'sessao1',f.id,'documento de outro órgão',:'doc_dec' from public.fases_sessao f where f.orgao_id='10000000-0000-0000-0000-000000000002' and f.nome='Ordem do Dia';
reset role;
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","aal":"aal2"}';
insert into public.sessoes (orgao_id,tipo,data_hora) values ('10000000-0000-0000-0000-000000000002','solene','2026-04-01 19:00-03');
reset role;
set role anon; set request.jwt.claims = '';
select 'anon vê sessões e pauta da câmara (esperado 3 1): ' || (select count(*) from public.sessoes) || ' ' || (select count(*) from public.pauta_itens);
reset role;

\echo '--- conteúdo: notícias, banners e atalhos'
set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","aal":"aal2"}';
insert into public.noticias (orgao_id, titulo, publicada) values ('10000000-0000-0000-0000-000000000001', 'Publicada', true);
insert into public.noticias (orgao_id, titulo) values ('10000000-0000-0000-0000-000000000001', 'Rascunho');
insert into public.noticias (orgao_id, titulo, publicada, publicado_em) values ('10000000-0000-0000-0000-000000000001', 'Agendada', true, now() + interval '1 day');
insert into public.noticias (orgao_id, titulo, imagem_caminho) values ('10000000-0000-0000-0000-000000000001', 'Sem alt', 'x/y.png');
insert into public.noticias (orgao_id, titulo) values ('10000000-0000-0000-0000-000000000002', 'Na câmara');
select 'B vê as 3 notícias da pref (esperado 3): ' || count(*) from public.noticias;
select 'publicar sem data preenche a data (esperado t): ' || (publicado_em is not null) from public.noticias where titulo='Publicada';
insert into public.banners (orgao_id, titulo) values ('10000000-0000-0000-0000-000000000001', 'No ar');
insert into public.banners (orgao_id, titulo, fim_em) values ('10000000-0000-0000-0000-000000000001', 'Vencido', now() - interval '1 day');
insert into public.banners (orgao_id, titulo, link_url) values ('10000000-0000-0000-0000-000000000001', 'Link perigoso', 'javascript:alert(1)');
insert into public.atalhos (orgao_id, rotulo, url) values ('10000000-0000-0000-0000-000000000001', 'IPTU', '/pref/iptu');
insert into public.atalhos (orgao_id, rotulo, url, ativo) values ('10000000-0000-0000-0000-000000000001', 'Oculto', '/pref/x', false);
insert into storage.objects (bucket_id, name) values ('conteudo', '10000000-0000-0000-0000-000000000001/foto.png');
insert into storage.objects (bucket_id, name) values ('conteudo', '10000000-0000-0000-0000-000000000002/foto.png');
insert into storage.objects (bucket_id, name) values ('conteudo', 'sem-orgao/foto.png');
select 'B enviou só para a pref (esperado 1): ' || count(*) from storage.objects where bucket_id='conteudo';
set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","aal":"aal1"}';
update public.noticias set titulo='sem 2FA' where titulo='Rascunho';
select 'B aal1 não altera (esperado 0): ' || count(*) from public.noticias where titulo='sem 2FA';
reset role;

set role anon; set request.jwt.claims = '';
select 'anon vê só a notícia publicada (esperado Publicada): ' || string_agg(titulo, ',') from public.noticias;
select 'anon vê só o banner no ar (esperado No ar): ' || string_agg(titulo, ',') from public.banners;
select 'anon vê só o atalho ativo (esperado IPTU): ' || string_agg(rotulo, ',') from public.atalhos;
insert into public.noticias (orgao_id, titulo) values ('10000000-0000-0000-0000-000000000001', 'anon');
reset role;

set role authenticated; set request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","aal":"aal2"}';
select 'C vê notícias da pref (esperado 1 = só a publicada): ' || count(*) from public.noticias where orgao_id='10000000-0000-0000-0000-000000000001';
delete from public.noticias where orgao_id='10000000-0000-0000-0000-000000000001';
update public.banners set titulo='hack' where orgao_id='10000000-0000-0000-0000-000000000001';
reset role;
select 'C não apagou nem alterou (esperado 3 2): ' || (select count(*) from public.noticias where orgao_id='10000000-0000-0000-0000-000000000001')
  || ' ' || (select count(*) from public.banners where titulo <> 'hack');
select 'auditoria registrou o conteúdo (esperado >=5): ' || count(*) from public.auditoria where tabela in ('public.noticias', 'public.banners', 'public.atalhos');
