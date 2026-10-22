-- Cria o perfil de contas que já existiam no Auth antes da migration base
-- (o gatilho ao_criar_usuario só pega contas novas).
insert into public.usuarios (id, nome, email)
select u.id, coalesce(u.raw_user_meta_data ->> 'nome', ''), lower(coalesce(u.email, ''))
from auth.users u
on conflict (id) do nothing;
