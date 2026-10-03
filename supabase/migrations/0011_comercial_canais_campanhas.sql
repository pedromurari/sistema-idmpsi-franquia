-- Comercial da unidade: canais de aquisição e campanhas. Executar após 0010.
begin;

create table public.franquia_canais (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid references public.franquias(id), -- null = padrão da rede
  nome text not null check (length(btrim(nome)) between 2 and 120),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index franquia_canais_nome_escopo on public.franquia_canais
  (coalesce(franquia_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(nome)));
create index franquia_canais_unidade on public.franquia_canais(franquia_id, ativo, nome);
alter table public.franquia_canais enable row level security;
revoke all on public.franquia_canais from public, anon, authenticated;
grant select, insert, update on public.franquia_canais to authenticated;
create policy "canais visiveis na rede e unidade" on public.franquia_canais for select to authenticated
  using (franquia_id is null or franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "canais proprios ou da rede pelo admin" on public.franquia_canais for insert to authenticated
  with check ((franquia_id = public.franquia_minha_unidade() and franquia_id is not null)
    or public.franquia_is_franqueador());
create policy "edita canais proprios ou admin" on public.franquia_canais for update to authenticated
  using ((franquia_id = public.franquia_minha_unidade() and franquia_id is not null)
    or public.franquia_is_franqueador())
  with check ((franquia_id = public.franquia_minha_unidade() and franquia_id is not null)
    or public.franquia_is_franqueador());

create table public.franquia_campanhas (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  canal_id uuid not null references public.franquia_canais(id),
  nome text not null check (length(btrim(nome)) between 2 and 160),
  tipo text not null default 'novo' check (tipo in ('novo', 'retorno')),
  oferta text check (oferta is null or length(btrim(oferta)) between 1 and 1000),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franquia_id, id)
);
create unique index franquia_campanhas_nome_unidade on public.franquia_campanhas
  (franquia_id, lower(btrim(nome)));
create index franquia_campanhas_canal on public.franquia_campanhas(franquia_id, canal_id, ativo);
alter table public.franquia_campanhas enable row level security;
revoke all on public.franquia_campanhas from public, anon, authenticated;
grant select, insert, update on public.franquia_campanhas to authenticated;
create policy "campanhas visiveis na unidade" on public.franquia_campanhas for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "cadastra campanha na unidade" on public.franquia_campanhas for insert to authenticated
  with check (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "edita campanha na unidade" on public.franquia_campanhas for update to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador())
  with check (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

alter table public.franquia_leads add column canal_id uuid references public.franquia_canais(id);
alter table public.franquia_leads add column campanha_id uuid;
alter table public.franquia_leads add constraint franquia_leads_campanha_mesma_unidade
  foreign key (franquia_id, campanha_id) references public.franquia_campanhas(franquia_id, id);
create index franquia_leads_canal on public.franquia_leads(franquia_id, canal_id);
create index franquia_leads_campanha on public.franquia_leads(franquia_id, campanha_id);

-- Escopo é imutável mesmo para o administrador; canal global ou da própria unidade.
create or replace function public.franquia_comercial_valida_escopo()
returns trigger language plpgsql set search_path = public as $$
declare canal_unidade uuid;
declare campanha_canal uuid;
begin
  if tg_table_name in ('franquia_canais', 'franquia_campanhas') and tg_op = 'UPDATE'
      and new.franquia_id is distinct from old.franquia_id then
    raise exception 'unidade do canal ou campanha é imutável';
  end if;
  if tg_table_name = 'franquia_campanhas' then
    select c.franquia_id into canal_unidade from public.franquia_canais c where c.id = new.canal_id;
    if not found or (canal_unidade is not null and canal_unidade <> new.franquia_id) then
      raise exception 'canal não pertence à unidade da campanha';
    end if;
  elsif tg_table_name = 'franquia_leads' then
    if new.canal_id is not null then
      select c.franquia_id into canal_unidade from public.franquia_canais c where c.id = new.canal_id;
      if not found or (canal_unidade is not null and canal_unidade <> new.franquia_id) then
        raise exception 'canal não pertence à unidade do lead';
      end if;
    end if;
    if new.campanha_id is not null then
      select c.canal_id into campanha_canal from public.franquia_campanhas c
        where c.id = new.campanha_id and c.franquia_id = new.franquia_id;
      if not found or new.canal_id is distinct from campanha_canal then
        raise exception 'campanha não pertence ao canal e unidade do lead';
      end if;
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_canal_escopo before update on public.franquia_canais
  for each row execute function public.franquia_comercial_valida_escopo();
create trigger trg_campanha_escopo before insert or update on public.franquia_campanhas
  for each row execute function public.franquia_comercial_valida_escopo();
create trigger trg_lead_canal_escopo before insert or update on public.franquia_leads
  for each row execute function public.franquia_comercial_valida_escopo();
create trigger trg_canal_updated_at before update on public.franquia_canais
  for each row execute function public.franquia_set_updated_at();
create trigger trg_campanha_updated_at before update on public.franquia_campanhas
  for each row execute function public.franquia_set_updated_at();
create trigger trg_canal_audit after insert or update on public.franquia_canais
  for each row execute function public.franquia_audit_trigger();
create trigger trg_campanha_audit after insert or update on public.franquia_campanhas
  for each row execute function public.franquia_audit_trigger();
create trigger trg_lead_audit after update on public.franquia_leads
  for each row execute function public.franquia_audit_trigger();

-- Catálogo inicial editável. Origem antiga continua intacta para consulta histórica.
insert into public.franquia_canais(nome) values
  ('Direto'), ('Indicação de aluno'), ('Indicação de terapeuta'), ('Instagram'),
  ('Google'), ('Webinário/Workshop'), ('Orgânico'), ('Retorno/Base');
insert into public.franquia_canais(franquia_id, nome)
select origem.franquia_id, origem.nome from (
  select l.franquia_id, min(btrim(l.origem)) as nome
  from public.franquia_leads l
  where l.origem is not null and btrim(l.origem) <> ''
    and not exists (select 1 from public.franquia_canais c
      where c.franquia_id is null and lower(btrim(c.nome)) = lower(btrim(l.origem)))
  group by l.franquia_id, lower(btrim(l.origem))
) origem;
update public.franquia_leads l set canal_id = c.id
from public.franquia_canais c
where l.origem is not null and lower(btrim(l.origem)) = lower(btrim(c.nome))
  and (c.franquia_id = l.franquia_id or c.franquia_id is null)
  and (c.franquia_id is not null or not exists (
    select 1 from public.franquia_canais local
    where local.franquia_id = l.franquia_id and lower(btrim(local.nome)) = lower(btrim(l.origem))
  ));

commit;
