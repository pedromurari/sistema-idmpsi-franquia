-- Modulo 3 do ROADMAP.md: fechamento real de royalties, nao so estimativa.
-- Mesmo padrao do franquia_fecha_comissao (0020): a funcao recalcula receita
-- e percentual no banco (nunca aceita isso do cliente) e so deixa fechar/
-- marcar pago quem a regra de royalties ja deixa configurar (franqueador).
begin;

create table public.franquia_royalties_fechamento (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  competencia date not null check (extract(day from competencia) = 1),
  base text not null check (base in ('caixa', 'competencia')),
  percentual_aplicado numeric(5,2) not null check (percentual_aplicado between 0 and 100),
  receita_base numeric(12,2) not null check (receita_base >= 0),
  valor_royalties numeric(12,2) not null check (valor_royalties >= 0),
  status text not null default 'fechado' check (status in ('fechado', 'pago')),
  fechado_por uuid not null references auth.users(id),
  fechado_em timestamptz not null default now(),
  pago_em timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franquia_id, competencia)
);

alter table public.franquia_royalties_fechamento enable row level security;
revoke all on public.franquia_royalties_fechamento from public, anon, authenticated;
grant select, update on public.franquia_royalties_fechamento to authenticated;

create policy "fechamento de royalties visivel na unidade" on public.franquia_royalties_fechamento for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

-- Sem "insert" direto: toda linha nasce via franquia_fecha_royalties()
-- (security definer), que recalcula tudo no banco em vez de confiar no cliente.
create policy "franqueador marca royalties como pago" on public.franquia_royalties_fechamento for update to authenticated
  using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());

create or replace function public.franquia_royalties_fechamento_verifica_escopo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.franquia_id <> old.franquia_id or new.competencia <> old.competencia
    or new.base <> old.base or new.percentual_aplicado <> old.percentual_aplicado
    or new.receita_base <> old.receita_base or new.valor_royalties <> old.valor_royalties
    or new.fechado_por <> old.fechado_por then
    raise exception 'fechamento de royalties é imutável -- só status/pago_em podem mudar';
  end if;
  if new.status = 'pago' and new.pago_em is null then
    new.pago_em := now();
  end if;
  return new;
end;
$$;
create trigger trg_royalties_fechamento_escopo before update on public.franquia_royalties_fechamento
  for each row execute function public.franquia_royalties_fechamento_verifica_escopo();
create trigger trg_royalties_fechamento_updated_at before update on public.franquia_royalties_fechamento
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_royalties_fechamento after insert or update on public.franquia_royalties_fechamento
  for each row execute function public.franquia_audit_trigger();

-- Fecha o royalties do mes de uma unidade: recalcula a receita (pela mesma
-- base -- caixa ou competencia -- da regra cadastrada) e o percentual
-- vigente dentro do banco, igual useFinanceiro.ts faz no navegador hoje,
-- so que aqui vira o numero oficial, travado.
create or replace function public.franquia_fecha_royalties(p_franquia_id uuid, p_competencia date)
returns public.franquia_royalties_fechamento
language plpgsql security definer set search_path = public as $$
declare
  v_inicio date := date_trunc('month', p_competencia)::date;
  v_fim date := (date_trunc('month', p_competencia) + interval '1 month')::date;
  v_base text;
  v_percentual numeric(5,2);
  v_receita numeric(12,2);
  v_valor numeric(12,2);
  v_resultado public.franquia_royalties_fechamento;
begin
  if not public.franquia_is_franqueador() then
    raise exception 'só o franqueador fecha royalties';
  end if;

  select base, percentual into v_base, v_percentual from public.franquia_royalties_regras
    where franquia_id = p_franquia_id and competencia = v_inicio;
  if not found then
    raise exception 'nenhuma regra de royalties cadastrada para esta competência';
  end if;

  if v_base = 'caixa' then
    select coalesce(sum(valor), 0) into v_receita from public.franquia_dre_lancamentos
      where franquia_id = p_franquia_id and tipo = 'receita'
        and data_liquidacao >= v_inicio and data_liquidacao < v_fim;
  else
    select coalesce(sum(valor), 0) into v_receita from public.franquia_dre_lancamentos
      where franquia_id = p_franquia_id and tipo = 'receita'
        and competencia >= v_inicio and competencia < v_fim;
  end if;

  v_valor := round(v_receita * v_percentual / 100, 2);

  insert into public.franquia_royalties_fechamento
    (franquia_id, competencia, base, percentual_aplicado, receita_base, valor_royalties, fechado_por)
    values (p_franquia_id, v_inicio, v_base, v_percentual, v_receita, v_valor, auth.uid())
    on conflict (franquia_id, competencia) do update set
      base = excluded.base,
      percentual_aplicado = excluded.percentual_aplicado,
      receita_base = excluded.receita_base,
      valor_royalties = excluded.valor_royalties,
      fechado_por = excluded.fechado_por,
      fechado_em = now()
    where public.franquia_royalties_fechamento.status = 'fechado'
    returning * into v_resultado;

  if v_resultado.id is null then
    raise exception 'este fechamento já foi marcado como pago e não pode ser refeito';
  end if;
  return v_resultado;
end;
$$;
revoke all on function public.franquia_fecha_royalties(uuid, date) from public;
grant execute on function public.franquia_fecha_royalties(uuid, date) to authenticated;

commit;
