-- Vincula a primeira conta (você) como franqueador -- só precisa rodar uma vez.
insert into public.franquia_profiles (id, nome, email, franquia_id, ativo)
values ('1328426d-5a21-4681-928b-0afdb3b6ccbb', 'Pedro Murari', 'pdrmurari@gmail.com', null, true)
on conflict (id) do nothing;

insert into public.franquia_user_roles (user_id, role)
values ('1328426d-5a21-4681-928b-0afdb3b6ccbb', 'franqueador')
on conflict (user_id) do nothing;
