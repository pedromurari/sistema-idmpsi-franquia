-- Dá acesso de administração (franqueador) a quem já tem conta no Supabase Auth.
--
-- 1) Supabase > Authentication > Users > "Add user" > "Send invitation" com o
--    e-mail de cada pessoa. O convite faz cada um definir a própria senha:
--    ninguém precisa saber a senha de ninguém. (Se preferir "Create new user",
--    marque "Auto Confirm User" e peça pra trocarem a senha no primeiro acesso.)
-- 2) Troque os e-mails e nomes abaixo e rode este bloco no SQL Editor.
--    Só vincula quem já existe em auth.users; se o e-mail não bater, a linha
--    simplesmente não entra (confira o resultado no select final).
with novos(email, nome) as (
  values
    ('EMAIL_DO_RODRYGO@exemplo.com', 'Rodrygo Murari'),
    ('EMAIL_DO_MARCOS@exemplo.com', 'Marcos Salvucci')
),
perfis as (
  insert into public.franquia_profiles (id, nome, email, franquia_id, ativo)
  select u.id, n.nome, u.email, null, true
  from novos n join auth.users u on lower(u.email) = lower(n.email)
  on conflict (id) do nothing
  returning id
)
insert into public.franquia_user_roles (user_id, role)
select u.id, 'franqueador'
from novos n join auth.users u on lower(u.email) = lower(n.email)
on conflict (user_id) do nothing;

-- Conferência: deve listar as duas pessoas como franqueador e ativas.
select p.nome, p.email, r.role, p.ativo
from public.franquia_profiles p
join public.franquia_user_roles r on r.user_id = p.id
order by r.role, p.nome;
