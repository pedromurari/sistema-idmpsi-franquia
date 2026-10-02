-- Captação de compradores de franquia: área da franqueadora, distinta do
-- funil de alunos por unidade (franquia_leads). Aplicar após 0006.
begin;

create table public.franquia_expansao_responsaveis (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(btrim(nome)) between 2 and 120),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  unique (nome)
);
alter table public.franquia_expansao_responsaveis enable row level security;
revoke all on public.franquia_expansao_responsaveis from public, anon, authenticated;
grant select, insert, update on public.franquia_expansao_responsaveis to authenticated;
create policy "adm le responsaveis de expansao" on public.franquia_expansao_responsaveis
  for select to authenticated using (public.franquia_is_franqueador());
create policy "adm cadastra responsaveis de expansao" on public.franquia_expansao_responsaveis
  for insert to authenticated with check (public.franquia_is_franqueador());
create policy "adm edita responsaveis de expansao" on public.franquia_expansao_responsaveis
  for update to authenticated using (public.franquia_is_franqueador())
  with check (public.franquia_is_franqueador());

create table public.franquia_expansao_leads (
  id uuid primary key default gen_random_uuid(),
  origem_id uuid unique,
  nome text not null check (length(btrim(nome)) between 2 and 160),
  whatsapp text,
  email text,
  cidade text,
  estado text,
  fase text not null default 'novo' check (fase in ('novo','contatado','reuniao_agendada','fechado','perdido')),
  responsavel_id uuid references public.franquia_expansao_responsaveis(id),
  observacoes text,
  dados_extras jsonb not null default '{}'::jsonb,
  origem text not null default 'manual' check (origem in ('manual','captura','crm_onze')),
  arquivado_em timestamptz,
  criado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (email is null or length(btrim(email)) between 5 and 254),
  check (whatsapp is null or length(regexp_replace(whatsapp, '[^0-9]', '', 'g')) between 8 and 15),
  check (email is not null or whatsapp is not null),
  check (cidade is null or length(btrim(cidade)) between 1 and 120),
  -- CRM legado contém estados escritos por extenso; preservar a origem.
  check (estado is null or length(btrim(estado)) between 1 and 80),
  check (jsonb_typeof(dados_extras) = 'object'),
  check (octet_length(dados_extras::text) <= 10000)
);
create index franquia_expansao_leads_fase on public.franquia_expansao_leads(fase, created_at desc) where arquivado_em is null;
create index franquia_expansao_leads_responsavel on public.franquia_expansao_leads(responsavel_id) where arquivado_em is null;
alter table public.franquia_expansao_leads enable row level security;
revoke all on public.franquia_expansao_leads from public, anon, authenticated;
grant select, insert, update on public.franquia_expansao_leads to authenticated;
create policy "adm le leads de expansao" on public.franquia_expansao_leads
  for select to authenticated using (public.franquia_is_franqueador());
create policy "adm cadastra leads de expansao" on public.franquia_expansao_leads
  for insert to authenticated with check (public.franquia_is_franqueador());
create policy "adm edita leads de expansao" on public.franquia_expansao_leads
  for update to authenticated using (public.franquia_is_franqueador())
  with check (public.franquia_is_franqueador());
create trigger trg_expansao_lead_updated_at before update on public.franquia_expansao_leads
  for each row execute function public.franquia_set_updated_at();
create trigger trg_expansao_lead_audit after insert or update on public.franquia_expansao_leads
  for each row execute function public.franquia_audit_trigger();

create table public.franquia_expansao_campanhas (
  id uuid primary key default gen_random_uuid(),
  data date not null default current_date,
  gasto numeric(12,2) not null default 0 check (gasto >= 0),
  impressoes integer not null default 0 check (impressoes >= 0),
  cliques integer not null default 0 check (cliques >= 0),
  leads_count integer not null default 0 check (leads_count >= 0),
  cpl numeric(12,2) generated always as (case when leads_count > 0 then round(gasto / leads_count, 2) else 0 end) stored,
  ctr numeric(6,2) generated always as (case when impressoes > 0 then round(cliques::numeric / impressoes * 100, 2) else 0 end) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.franquia_expansao_campanhas enable row level security;
revoke all on public.franquia_expansao_campanhas from public, anon, authenticated;
grant select, insert, update on public.franquia_expansao_campanhas to authenticated;
create policy "adm le campanhas de expansao" on public.franquia_expansao_campanhas
  for select to authenticated using (public.franquia_is_franqueador());
create policy "adm cadastra campanhas de expansao" on public.franquia_expansao_campanhas
  for insert to authenticated with check (public.franquia_is_franqueador());
create policy "adm edita campanhas de expansao" on public.franquia_expansao_campanhas
  for update to authenticated using (public.franquia_is_franqueador())
  with check (public.franquia_is_franqueador());
create trigger trg_expansao_campanha_updated_at before update on public.franquia_expansao_campanhas
  for each row execute function public.franquia_set_updated_at();
create trigger trg_expansao_campanha_audit after insert or update on public.franquia_expansao_campanhas
  for each row execute function public.franquia_audit_trigger();

insert into public.franquia_expansao_responsaveis(nome) values ('Rodrygo'), ('Marcos');
commit;
