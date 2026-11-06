-- Fase E do COMERCIAL_PARIDADE.md: dados e graficos.
-- "Agregar no banco (RPC com escopo RLS), nunca baixar linhas pro navegador"
-- -- todas as funcoes abaixo sao SECURITY INVOKER: rodam com os privilegios
-- (e o RLS) de quem chama, entao um vendedor ve o proprio recorte
-- automaticamente, sem a funcao precisar filtrar por usuario.
--
-- No caminho, achamos que "historico visivel na unidade" (0005) e
-- "atividades visiveis na unidade" (0012) foram escritas antes do papel de
-- vendedor existir (0018): elas liberam toda a unidade sem checar se o lead
-- e do vendedor ou esta livre. Hoje isso deixa um vendedor ler, via API,
-- a timeline e as notas de leads de outro vendedor. Fechamos isso aqui porque
-- o comparativo por vendedor desta fase soma essas mesmas tabelas.
begin;

drop policy "historico visivel na unidade" on public.franquia_lead_etapas;
create policy "historico visivel conforme papel" on public.franquia_lead_etapas for select to authenticated
  using (
    public.franquia_is_franqueador()
    or (
      franquia_id = public.franquia_minha_unidade()
      and (
        not public.franquia_is_vendedor()
        or exists (
          select 1 from public.franquia_leads l
          where l.franquia_id = franquia_lead_etapas.franquia_id
            and l.id = franquia_lead_etapas.lead_id
            and (l.vendedor_id is null or l.vendedor_id = auth.uid())
        )
      )
    )
  );

drop policy "atividades visiveis na unidade" on public.franquia_lead_atividades;
create policy "atividades visiveis conforme papel" on public.franquia_lead_atividades for select to authenticated
  using (
    public.franquia_is_franqueador()
    or (
      franquia_id = public.franquia_minha_unidade()
      and (
        not public.franquia_is_vendedor()
        or exists (
          select 1 from public.franquia_leads l
          where l.franquia_id = franquia_lead_atividades.franquia_id
            and l.id = franquia_lead_atividades.lead_id
            and (l.vendedor_id is null or l.vendedor_id = auth.uid())
        )
      )
    )
  );

create index franquia_leads_canal_mes on public.franquia_leads(franquia_id, canal_id, created_at);
create index franquia_vendas_status_data on public.franquia_vendas(franquia_id, status, data_registro);
create index franquia_lead_atividades_ator on public.franquia_lead_atividades(franquia_id, ator, created_at desc);

create or replace function public.franquia_comercial_leads_canal_mes(p_franquia_id uuid, p_meses integer default 6)
returns table(mes date, canal_nome text, quantidade bigint)
language sql stable security invoker set search_path = public as $$
  select date_trunc('month', l.created_at)::date as mes,
         coalesce(c.nome, 'Sem canal') as canal_nome,
         count(*)::bigint as quantidade
  from public.franquia_leads l
  left join public.franquia_canais c on c.id = l.canal_id
  where l.franquia_id = p_franquia_id
    and l.created_at >= date_trunc('month', now() at time zone 'America/Sao_Paulo')
      - (least(greatest(p_meses, 1), 24) - 1) * interval '1 month'
  group by 1, 2
  order by 1, 2;
$$;
revoke all on function public.franquia_comercial_leads_canal_mes(uuid, integer) from public;
grant execute on function public.franquia_comercial_leads_canal_mes(uuid, integer) to authenticated;

create or replace function public.franquia_comercial_funil(p_franquia_id uuid, p_inicio date, p_fim date)
returns table(etapa text, quantidade bigint)
language sql stable security invoker set search_path = public as $$
  select e.etapa_nova as etapa, count(distinct e.lead_id)::bigint as quantidade
  from public.franquia_lead_etapas e
  where e.franquia_id = p_franquia_id
    and e.created_at >= p_inicio::timestamptz
    and e.created_at < (p_fim + 1)::timestamptz
  group by 1;
$$;
revoke all on function public.franquia_comercial_funil(uuid, date, date) from public;
grant execute on function public.franquia_comercial_funil(uuid, date, date) to authenticated;

create or replace function public.franquia_comercial_vendas_mes(p_franquia_id uuid, p_meses integer default 6)
returns table(mes date, quantidade bigint, valor_liquido numeric)
language sql stable security invoker set search_path = public as $$
  select date_trunc('month', v.data_registro)::date as mes,
         count(*)::bigint as quantidade,
         coalesce(sum(v.valor_liquido), 0)::numeric as valor_liquido
  from public.franquia_vendas v
  where v.franquia_id = p_franquia_id and v.status = 'confirmada'
    and v.data_registro >= (date_trunc('month', now() at time zone 'America/Sao_Paulo')
      - (least(greatest(p_meses, 1), 24) - 1) * interval '1 month')::date
  group by 1
  order by 1;
$$;
revoke all on function public.franquia_comercial_vendas_mes(uuid, integer) from public;
grant execute on function public.franquia_comercial_vendas_mes(uuid, integer) to authenticated;

create or replace function public.franquia_comercial_vendas_dia_semana(p_franquia_id uuid, p_meses integer default 6)
returns table(dia_semana integer, quantidade bigint)
language sql stable security invoker set search_path = public as $$
  select extract(dow from v.data_registro)::integer as dia_semana, count(*)::bigint as quantidade
  from public.franquia_vendas v
  where v.franquia_id = p_franquia_id and v.status = 'confirmada'
    and v.data_registro >= (date_trunc('month', now() at time zone 'America/Sao_Paulo')
      - (least(greatest(p_meses, 1), 24) - 1) * interval '1 month')::date
  group by 1
  order by 1;
$$;
revoke all on function public.franquia_comercial_vendas_dia_semana(uuid, integer) from public;
grant execute on function public.franquia_comercial_vendas_dia_semana(uuid, integer) to authenticated;

create or replace function public.franquia_comercial_ciclo_venda(p_franquia_id uuid, p_meses integer default 6)
returns table(dias_medio numeric, amostras bigint)
language sql stable security invoker set search_path = public as $$
  select coalesce(avg(v.data_registro - l.created_at::date), 0)::numeric as dias_medio,
         count(*)::bigint as amostras
  from public.franquia_vendas v
  join public.franquia_leads l on l.franquia_id = v.franquia_id and l.id = v.lead_id
  where v.franquia_id = p_franquia_id and v.status = 'confirmada'
    and v.data_registro >= (date_trunc('month', now() at time zone 'America/Sao_Paulo')
      - (least(greatest(p_meses, 1), 24) - 1) * interval '1 month')::date;
$$;
revoke all on function public.franquia_comercial_ciclo_venda(uuid, integer) from public;
grant execute on function public.franquia_comercial_ciclo_venda(uuid, integer) to authenticated;

create or replace function public.franquia_comercial_vendedor_resumo(p_franquia_id uuid, p_competencia date)
returns table(vendedor_id uuid, leads_atribuidos bigint, vendas bigint, valor_liquido numeric, atividades bigint)
language sql stable security invoker set search_path = public as $$
  with periodo as (
    select date_trunc('month', p_competencia)::date as inicio,
           (date_trunc('month', p_competencia) + interval '1 month')::date as fim
  ),
  leads as (
    select l.vendedor_id, count(*)::bigint as leads_atribuidos
    from public.franquia_leads l, periodo
    where l.franquia_id = p_franquia_id and l.vendedor_id is not null
      and l.created_at >= periodo.inicio and l.created_at < periodo.fim
    group by l.vendedor_id
  ),
  vendas as (
    select v.vendedor_id, count(*)::bigint as vendas, coalesce(sum(v.valor_liquido), 0)::numeric as valor_liquido
    from public.franquia_vendas v, periodo
    where v.franquia_id = p_franquia_id and v.status = 'confirmada'
      and v.data_registro >= periodo.inicio and v.data_registro < periodo.fim
    group by v.vendedor_id
  ),
  atividades as (
    select a.ator as vendedor_id, count(*)::bigint as atividades
    from public.franquia_lead_atividades a, periodo
    where a.franquia_id = p_franquia_id
      and a.created_at >= periodo.inicio and a.created_at < periodo.fim
    group by a.ator
  )
  select coalesce(leads.vendedor_id, vendas.vendedor_id, atividades.vendedor_id) as vendedor_id,
         coalesce(leads.leads_atribuidos, 0) as leads_atribuidos,
         coalesce(vendas.vendas, 0) as vendas,
         coalesce(vendas.valor_liquido, 0) as valor_liquido,
         coalesce(atividades.atividades, 0) as atividades
  from leads
  full outer join vendas on vendas.vendedor_id = leads.vendedor_id
  full outer join atividades on atividades.vendedor_id = coalesce(leads.vendedor_id, vendas.vendedor_id);
$$;
revoke all on function public.franquia_comercial_vendedor_resumo(uuid, date) from public;
grant execute on function public.franquia_comercial_vendedor_resumo(uuid, date) to authenticated;

commit;
