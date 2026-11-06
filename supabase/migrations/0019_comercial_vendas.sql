-- Fase C do COMERCIAL_PARIDADE.md: franquia_vendas.
-- Matrícula passa a poder gerar uma venda de verdade (valor bruto/líquido,
-- forma de pagamento, data prevista x data de registro). Ainda não lança no
-- financeiro nem gera ficha de aluno -- isso é integração futura dos módulos
-- 2 e 3, citada no doc como pendência conhecida.
begin;

create table public.franquia_vendas (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  lead_id uuid not null,
  vendedor_id uuid not null references auth.users(id),
  turma_id uuid,
  valor_bruto numeric(12,2) not null check (valor_bruto >= 0),
  -- líquido da taxa do gateway -- comissão e faturamento se calculam sobre
  -- este valor, nunca sobre o bruto (lição citada no doc, linha 55).
  valor_liquido numeric(12,2) not null check (valor_liquido >= 0 and valor_liquido <= valor_bruto),
  forma_pagamento text not null check (length(btrim(forma_pagamento)) between 1 and 60),
  -- data_venda = pagamento previsto (pode ser futura, ex.: pré-matrícula).
  -- data_registro = dia em que o vendedor de fato fechou a venda.
  data_venda date not null,
  data_registro date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  status text not null default 'pendente' check (status in ('pendente', 'confirmada', 'cancelada')),
  observacoes text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (franquia_id, lead_id) references public.franquia_leads(franquia_id, id),
  foreign key (franquia_id, turma_id) references public.franquia_turmas(franquia_id, id)
);

-- No máximo uma venda ativa (não cancelada) por lead -- evita duplicar a
-- mesma matrícula em várias linhas por engano.
create unique index franquia_vendas_lead_ativa on public.franquia_vendas(franquia_id, lead_id)
  where status <> 'cancelada';
create index franquia_vendas_vendedor on public.franquia_vendas(franquia_id, vendedor_id, data_registro desc);
create index franquia_vendas_turma on public.franquia_vendas(franquia_id, turma_id) where turma_id is not null;

alter table public.franquia_vendas enable row level security;
revoke all on public.franquia_vendas from public, anon, authenticated;
grant select, insert, update on public.franquia_vendas to authenticated;

create policy "vendas visiveis conforme papel" on public.franquia_vendas for select to authenticated
  using (
    public.franquia_is_franqueador()
    or (
      franquia_id = public.franquia_minha_unidade()
      and (not public.franquia_is_vendedor() or vendedor_id = auth.uid())
    )
  );

create policy "registra venda na unidade" on public.franquia_vendas for insert to authenticated
  with check (
    (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador())
    and (not public.franquia_is_vendedor() or vendedor_id = auth.uid())
    and criado_por = auth.uid()
  );

create policy "atualiza venda na unidade" on public.franquia_vendas for update to authenticated
  using (
    public.franquia_is_franqueador()
    or (
      franquia_id = public.franquia_minha_unidade()
      and (not public.franquia_is_vendedor() or vendedor_id = auth.uid())
    )
  )
  with check (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

-- Escopo (unidade/lead/vendedor/criador) é imutável depois de criado; só o
-- franqueador pode confirmar ou cancelar uma venda -- vendedor/franqueado
-- corrigem dados enquanto ainda está 'pendente', não o status em si.
create or replace function public.franquia_venda_verifica_escopo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.franquia_id <> old.franquia_id or new.lead_id <> old.lead_id
    or new.vendedor_id <> old.vendedor_id or new.criado_por is distinct from old.criado_por then
    raise exception 'unidade, lead, vendedor e criador da venda são imutáveis';
  end if;
  if new.status is distinct from old.status and not public.franquia_is_franqueador() then
    raise exception 'só o franqueador confirma ou cancela uma venda';
  end if;
  return new;
end;
$$;
create trigger trg_venda_escopo before update on public.franquia_vendas
  for each row execute function public.franquia_venda_verifica_escopo();
create trigger trg_venda_updated_at before update on public.franquia_vendas
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_vendas after insert or update on public.franquia_vendas
  for each row execute function public.franquia_audit_trigger();

commit;
