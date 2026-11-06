-- Fase B do COMERCIAL_PARIDADE.md: papel de vendedor + atribuição de lead.
-- Vendedor é um papel adicional dentro de uma unidade -- continua tendo
-- franquia_profiles.franquia_id (vê só a própria unidade), mas dentro dela só
-- deve enxergar: os leads que já pegou, e os leads da unidade ainda sem
-- vendedor (fila). Franqueado e franqueador continuam vendo tudo da unidade.
begin;

alter table public.franquia_user_roles
  drop constraint franquia_user_roles_role_check;
alter table public.franquia_user_roles
  add constraint franquia_user_roles_role_check
  check (role in ('franqueador', 'franqueado', 'vendedor'));

-- Vendedor também precisa de franquia_id (franquia_minha_unidade() depende
-- disso) -- a trava original só exigia isso pra 'franqueado'.
create or replace function public.franquia_valida_vinculo()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.franquia_user_roles
    where user_id = new.id and role in ('franqueado', 'vendedor')
  ) and new.franquia_id is null then
    raise exception 'franqueado/vendedor precisa estar vinculado a uma franquia_id';
  end if;
  return new;
end;
$$;

create or replace function public.franquia_is_vendedor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.franquia_user_roles
    where user_id = auth.uid() and role = 'vendedor'
  );
$$;

alter table public.franquia_leads
  add column vendedor_id uuid references auth.users(id);
create index franquia_leads_vendedor on public.franquia_leads(franquia_id, vendedor_id)
  where vendedor_id is not null;

-- "Pegar lead": o vendedor só pode se auto-atribuir um lead da própria unidade
-- que ainda esteja livre (vendedor_id is null) -- nunca tomar lead de colega
-- nem se desatribuir depois de pegar (evita disputa/fraude de fila).
create or replace function public.franquia_lead_verifica_atribuicao()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.vendedor_id is distinct from old.vendedor_id then
    if public.franquia_is_franqueador() or (
      old.franquia_id = public.franquia_minha_unidade()
      and old.vendedor_id is null
      and new.vendedor_id = auth.uid()
      and public.franquia_is_vendedor()
    ) then
      return new;
    end if;
    raise exception 'vendedor só pode pegar lead livre da própria unidade';
  end if;
  return new;
end;
$$;
create trigger trg_lead_atribuicao before update on public.franquia_leads
  for each row execute function public.franquia_lead_verifica_atribuicao();

-- Policy de select substituída: vendedor vê só o que pegou + fila livre da
-- unidade; franqueado/franqueador continuam vendo tudo da unidade/rede.
drop policy "leads visiveis na unidade" on public.franquia_leads;
create policy "leads visiveis conforme papel" on public.franquia_leads for select to authenticated
  using (
    public.franquia_is_franqueador()
    or (
      franquia_id = public.franquia_minha_unidade()
      and (not public.franquia_is_vendedor() or vendedor_id = auth.uid() or vendedor_id is null)
    )
  );

-- Update: vendedor só edita (etapa, próxima ação, score etc.) o que já é
-- dele; pegar um lead livre (vendedor_id null -> próprio id) passa pelo
-- trigger de atribuição acima, não por esta policy de linha-alvo.
drop policy "atualiza lead na unidade" on public.franquia_leads;
create policy "atualiza lead na unidade" on public.franquia_leads for update to authenticated
  using (
    franquia_id = public.franquia_minha_unidade()
    and (not public.franquia_is_vendedor() or vendedor_id = auth.uid() or vendedor_id is null)
  )
  with check (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

commit;
