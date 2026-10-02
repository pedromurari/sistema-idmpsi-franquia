-- Etapa 1 do ROADMAP: turmas, caixa realizado e estimativa mensal de royalties.
-- Aplicar após 0001 e 0002 no projeto Supabase da FRANQUIA.
-- Não preenche turma, liquidação ou royalties dos registros existentes.
begin;

-- TG_OP é maiúsculo no Postgres. A versão inicial comparava com minúsculas,
-- registrando o evento, mas deixando dados_antigos/dados_novos sempre NULL.
create or replace function public.franquia_audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.franquia_audit_log (tabela, registro_id, acao, ator, dados_antigos, dados_novos)
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    lower(tg_op), auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

-- Usuário desativado não pode continuar acessando dados com um JWT ainda válido.
create or replace function public.franquia_is_franqueador()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.franquia_user_roles r
    join public.franquia_profiles p on p.id = r.user_id
    where r.user_id = auth.uid() and r.role = 'franqueador' and p.ativo
  );
$$;
create or replace function public.franquia_minha_unidade()
returns uuid language sql stable security definer set search_path = public as $$
  select p.franquia_id from public.franquia_profiles p
  join public.franquia_user_roles r on r.user_id = p.id
  where p.id = auth.uid() and p.ativo and r.role = 'franqueado';
$$;

create table public.franquia_turmas (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  nome text not null check (length(btrim(nome)) between 1 and 120),
  curso text not null check (length(btrim(curso)) between 1 and 160),
  data_inicio date,
  data_fim date,
  capacidade integer check (capacidade between 1 and 10000),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franquia_id, id),
  check (data_fim is null or (data_inicio is not null and data_fim >= data_inicio))
);
create unique index franquia_turmas_nome_unico on public.franquia_turmas (franquia_id, lower(btrim(nome)));
alter table public.franquia_turmas enable row level security;
grant select, insert, update on public.franquia_turmas to authenticated;
create policy "consulta turmas da unidade" on public.franquia_turmas for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "franqueador cadastra turmas" on public.franquia_turmas for insert to authenticated
  with check (public.franquia_is_franqueador());
create policy "franqueador edita turmas" on public.franquia_turmas for update to authenticated
  using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());
create trigger trg_turmas_updated_at before update on public.franquia_turmas
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_turmas after insert or update or delete on public.franquia_turmas
  for each row execute function public.franquia_audit_trigger();

alter table public.franquia_dre_lancamentos
  add column turma_id uuid,
  add column data_liquidacao date check (data_liquidacao <= (now() at time zone 'America/Sao_Paulo')::date),
  add column updated_at timestamptz not null default now(),
  -- FK composta impede vincular um lançamento à turma de OUTRA unidade,
  -- inclusive quando a escrita é feita pelo administrador.
  add constraint dre_turma_mesma_unidade foreign key (franquia_id, turma_id)
    references public.franquia_turmas(franquia_id, id);
comment on column public.franquia_dre_lancamentos.data_liquidacao is
  'Data do recebimento/pagamento integral. NULL = sem baixa informada; não inferir inadimplência. Parcelas parciais ainda não suportadas.';
create index idx_dre_turma on public.franquia_dre_lancamentos (franquia_id, turma_id);
create index idx_dre_caixa on public.franquia_dre_lancamentos (franquia_id, data_liquidacao);
create trigger trg_dre_updated_at before update on public.franquia_dre_lancamentos
  for each row execute function public.franquia_set_updated_at();

-- Cada mês exige configuração explícita: nenhuma alíquota/base presumida,
-- nenhuma mudança automática nos meses anteriores, nenhuma cobrança gerada.
create table public.franquia_royalties_regras (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  competencia date not null check (extract(day from competencia) = 1),
  base text not null check (base in ('caixa', 'competencia')),
  percentual numeric(5,2) not null check (percentual between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franquia_id, competencia)
);
alter table public.franquia_royalties_regras enable row level security;
grant select, insert, update on public.franquia_royalties_regras to authenticated;
create policy "consulta royalties da unidade" on public.franquia_royalties_regras for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "franqueador configura royalties" on public.franquia_royalties_regras for insert to authenticated
  with check (public.franquia_is_franqueador());
create policy "franqueador altera royalties" on public.franquia_royalties_regras for update to authenticated
  using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());
create trigger trg_royalties_updated_at before update on public.franquia_royalties_regras
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_royalties after insert or update or delete on public.franquia_royalties_regras
  for each row execute function public.franquia_audit_trigger();

commit;
