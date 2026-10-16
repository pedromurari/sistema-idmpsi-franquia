-- O portal já bloqueia a navegação sem TOTP. Reforça a mesma exigência no
-- Postgres para que uma chamada direta à API com JWT aal1 não contorne a UI.
-- Perfil e papel próprios continuam legíveis em aal1 para iniciar o 2FA;
-- leituras de terceiros e qualquer escrita neles dependem dos helpers abaixo.
begin;

create or replace function public.franquia_is_franqueador()
returns boolean language sql stable security definer set search_path = public as $$
  select (select auth.jwt()->>'aal') = 'aal2' and exists (
    select 1 from public.franquia_user_roles r
    join public.franquia_profiles p on p.id = r.user_id
    where r.user_id = auth.uid() and r.role = 'franqueador' and p.ativo
  );
$$;

create or replace function public.franquia_minha_unidade()
returns uuid language sql stable security definer set search_path = public as $$
  select p.franquia_id from public.franquia_profiles p
  join public.franquia_user_roles r on r.user_id = p.id
  where p.id = auth.uid() and p.ativo and r.role = 'franqueado'
    and (select auth.jwt()->>'aal') = 'aal2';
$$;

create or replace function public.franquia_usuario_ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select (select auth.jwt()->>'aal') = 'aal2' and exists (
    select 1 from public.franquia_profiles p
    join public.franquia_user_roles r on r.user_id = p.id
    where p.id = auth.uid() and p.ativo
  );
$$;

-- Política restritiva combina com TODAS as políticas permissivas existentes,
-- inclusive as que não usam os helpers. Não afeta edge functions service_role.
do $$
declare tabela record;
begin
  for tabela in
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity
      and c.relname not in ('franquia_profiles', 'franquia_user_roles')
  loop
    execute format('create policy "exige mfa aal2" on public.%I as restrictive for all to authenticated using ((select auth.jwt()->>''aal'') = ''aal2'') with check ((select auth.jwt()->>''aal'') = ''aal2'')', tabela.relname);
  end loop;
end;
$$;

commit;
