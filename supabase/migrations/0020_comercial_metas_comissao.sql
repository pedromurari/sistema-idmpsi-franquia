-- Fase D do COMERCIAL_PARIDADE.md: meta por vendedor e comissao configuravel.
-- "Regra configuravel pela administracao -- nenhum percentual presumido": o
-- franqueador cadastra a regra (padrao da unidade e/ou por vendedor), nunca um
-- valor fixo decidido por codigo. O fechamento mensal roda dentro de uma
-- funcao SECURITY DEFINER para que o calculo nunca dependa do que o cliente
-- manda (soma de vendas e percentual aplicado sao sempre recalculados no banco).
begin;

create table public.franquia_metas_vendedor (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  vendedor_id uuid not null references auth.users(id),
  competencia date not null,
  meta_matriculas integer not null check (meta_matriculas >= 0 and meta_matriculas <= 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franquia_id, vendedor_id, competencia)
);

alter table public.franquia_metas_vendedor enable row level security;
revoke all on public.franquia_metas_vendedor from public, anon, authenticated;
grant select, insert, update on public.franquia_metas_vendedor to authenticated;

create policy "metas de vendedor visiveis na unidade" on public.franquia_metas_vendedor for select to authenticated
  using (
    public.franquia_is_franqueador()
    or (franquia_id = public.franquia_minha_unidade() and (not public.franquia_is_vendedor() or vendedor_id = auth.uid()))
  );
-- Meta e decisao administrativa: so o franqueador define, nunca o proprio vendedor.
create policy "franqueador define meta de vendedor" on public.franquia_metas_vendedor for insert to authenticated
  with check (public.franquia_is_franqueador());
create policy "franqueador atualiza meta de vendedor" on public.franquia_metas_vendedor for update to authenticated
  using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());

create trigger trg_metas_vendedor_updated_at before update on public.franquia_metas_vendedor
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_metas_vendedor after insert or update on public.franquia_metas_vendedor
  for each row execute function public.franquia_audit_trigger();

create table public.franquia_regra_comissao (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  -- null = regra padrao da unidade, aplicada a quem nao tem regra propria.
  vendedor_id uuid references auth.users(id),
  percentual numeric(5,2) not null check (percentual >= 0 and percentual <= 100),
  observacoes text,
  ativo boolean not null default true,
  criado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No maximo uma regra ativa por vendedor, e uma regra padrao ativa por unidade.
create unique index franquia_regra_comissao_vendedor_ativa on public.franquia_regra_comissao(franquia_id, vendedor_id)
  where ativo and vendedor_id is not null;
create unique index franquia_regra_comissao_padrao_ativa on public.franquia_regra_comissao(franquia_id)
  where ativo and vendedor_id is null;

alter table public.franquia_regra_comissao enable row level security;
revoke all on public.franquia_regra_comissao from public, anon, authenticated;
grant select, insert, update on public.franquia_regra_comissao to authenticated;

create policy "regra de comissao visivel na unidade" on public.franquia_regra_comissao for select to authenticated
  using (
    public.franquia_is_franqueador()
    or (franquia_id = public.franquia_minha_unidade() and (not public.franquia_is_vendedor() or vendedor_id is null or vendedor_id = auth.uid()))
  );
-- Comissao e decisao administrativa: so o franqueador cadastra ou muda regra.
create policy "franqueador cadastra regra de comissao" on public.franquia_regra_comissao for insert to authenticated
  with check (public.franquia_is_franqueador() and criado_por = auth.uid());
create policy "franqueador atualiza regra de comissao" on public.franquia_regra_comissao for update to authenticated
  using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());

create trigger trg_regra_comissao_updated_at before update on public.franquia_regra_comissao
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_regra_comissao after insert or update on public.franquia_regra_comissao
  for each row execute function public.franquia_audit_trigger();

create table public.franquia_comissoes_fechamento (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  vendedor_id uuid not null references auth.users(id),
  competencia date not null,
  total_vendas_liquido numeric(12,2) not null check (total_vendas_liquido >= 0),
  percentual_aplicado numeric(5,2) not null check (percentual_aplicado >= 0 and percentual_aplicado <= 100),
  valor_comissao numeric(12,2) not null check (valor_comissao >= 0),
  status text not null default 'fechado' check (status in ('fechado', 'pago')),
  fechado_por uuid not null references auth.users(id),
  fechado_em timestamptz not null default now(),
  pago_em timestamptz,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franquia_id, vendedor_id, competencia)
);

alter table public.franquia_comissoes_fechamento enable row level security;
revoke all on public.franquia_comissoes_fechamento from public, anon, authenticated;
grant select, update on public.franquia_comissoes_fechamento to authenticated;
-- Sem "insert" direto: toda linha nasce via franquia_fecha_comissao() (security definer),
-- que recalcula o total e o percentual no banco em vez de confiar no cliente.

create policy "fechamentos de comissao visiveis na unidade" on public.franquia_comissoes_fechamento for select to authenticated
  using (
    public.franquia_is_franqueador()
    or (franquia_id = public.franquia_minha_unidade() and (not public.franquia_is_vendedor() or vendedor_id = auth.uid()))
  );
-- So marcar como pago muda por update; o resto do fechamento e imutavel.
create policy "franqueador marca comissao como paga" on public.franquia_comissoes_fechamento for update to authenticated
  using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());

create or replace function public.franquia_comissao_verifica_escopo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.franquia_id <> old.franquia_id or new.vendedor_id <> old.vendedor_id or new.competencia <> old.competencia
    or new.total_vendas_liquido <> old.total_vendas_liquido or new.percentual_aplicado <> old.percentual_aplicado
    or new.valor_comissao <> old.valor_comissao or new.fechado_por <> old.fechado_por then
    raise exception 'fechamento de comissao e imutavel -- so status/pago_em podem mudar';
  end if;
  if new.status = 'pago' and new.pago_em is null then
    new.pago_em := now();
  end if;
  return new;
end;
$$;
create trigger trg_comissao_escopo before update on public.franquia_comissoes_fechamento
  for each row execute function public.franquia_comissao_verifica_escopo();
create trigger trg_comissao_updated_at before update on public.franquia_comissoes_fechamento
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_comissao after insert or update on public.franquia_comissoes_fechamento
  for each row execute function public.franquia_audit_trigger();

-- Fecha a comissao do mes de um vendedor: recalcula soma das vendas confirmadas
-- e o percentual vigente dentro do banco (nunca aceita esses numeros do cliente),
-- e so deixa o franqueador da propria unidade do vendedor executar.
create or replace function public.franquia_fecha_comissao(p_vendedor_id uuid, p_competencia date)
returns public.franquia_comissoes_fechamento
language plpgsql security definer set search_path = public as $$
declare
  v_franquia_id uuid;
  v_total numeric(12,2);
  v_percentual numeric(5,2);
  v_valor numeric(12,2);
  v_inicio date := date_trunc('month', p_competencia)::date;
  v_fim date := (date_trunc('month', p_competencia) + interval '1 month')::date;
  v_resultado public.franquia_comissoes_fechamento;
begin
  if not public.franquia_is_franqueador() then
    raise exception 'só o franqueador fecha comissão';
  end if;
  select franquia_id into v_franquia_id from public.franquia_user_roles
    where user_id = p_vendedor_id and role = 'vendedor' limit 1;
  if v_franquia_id is null then
    raise exception 'vendedor não encontrado';
  end if;

  select coalesce(sum(valor_liquido), 0) into v_total from public.franquia_vendas
    where vendedor_id = p_vendedor_id and franquia_id = v_franquia_id and status = 'confirmada'
      and data_registro >= v_inicio and data_registro < v_fim;

  select percentual into v_percentual from public.franquia_regra_comissao
    where franquia_id = v_franquia_id and vendedor_id = p_vendedor_id and ativo limit 1;
  if v_percentual is null then
    select percentual into v_percentual from public.franquia_regra_comissao
      where franquia_id = v_franquia_id and vendedor_id is null and ativo limit 1;
  end if;
  if v_percentual is null then
    raise exception 'nenhuma regra de comissão cadastrada para esta unidade ou vendedor';
  end if;

  v_valor := round(v_total * v_percentual / 100, 2);

  insert into public.franquia_comissoes_fechamento
    (franquia_id, vendedor_id, competencia, total_vendas_liquido, percentual_aplicado, valor_comissao, fechado_por)
    values (v_franquia_id, p_vendedor_id, v_inicio, v_total, v_percentual, v_valor, auth.uid())
    on conflict (franquia_id, vendedor_id, competencia) do update set
      total_vendas_liquido = excluded.total_vendas_liquido,
      percentual_aplicado = excluded.percentual_aplicado,
      valor_comissao = excluded.valor_comissao,
      fechado_por = excluded.fechado_por,
      fechado_em = now()
    where public.franquia_comissoes_fechamento.status = 'fechado'
    returning * into v_resultado;

  if v_resultado.id is null then
    raise exception 'esta comissão já foi marcada como paga e não pode ser refeita';
  end if;
  return v_resultado;
end;
$$;
revoke all on function public.franquia_fecha_comissao(uuid, date) from public;
grant execute on function public.franquia_fecha_comissao(uuid, date) to authenticated;

commit;
