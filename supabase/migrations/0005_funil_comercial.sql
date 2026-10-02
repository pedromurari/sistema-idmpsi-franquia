-- Funil comercial da franquia. Executar após 0004 no projeto IDM PSI Franquia.
begin;

create table public.franquia_leads (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  turma_id uuid,
  nome text not null check (length(btrim(nome)) between 2 and 160),
  email text check (email is null or (length(btrim(email)) between 5 and 254 and position('@' in email) > 1)),
  telefone text check (telefone is null or length(regexp_replace(telefone, '[^0-9]', '', 'g')) between 8 and 15),
  origem text check (origem is null or length(btrim(origem)) between 1 and 120),
  etapa text not null default 'lead' check (etapa in (
    'lead', 'atendimento', 'experiencia', 'matricula', 'aluno', 'formado', 'pos_graduacao', 'perdido'
  )),
  score integer check (score between 0 and 100),
  proxima_acao_em date,
  proxima_acao text check (proxima_acao is null or length(btrim(proxima_acao)) between 1 and 300),
  bolsa_percentual numeric(5,2) not null default 0 check (bolsa_percentual between 0 and 100),
  desconto_percentual numeric(5,2) not null default 0 check (desconto_percentual between 0 and 100),
  motivo_perda text,
  observacoes text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franquia_id, id),
  foreign key (franquia_id, turma_id) references public.franquia_turmas(franquia_id, id),
  check (email is not null or telefone is not null),
  check (bolsa_percentual + desconto_percentual <= 100),
  check ((etapa = 'perdido' and nullif(btrim(motivo_perda), '') is not null)
    or (etapa <> 'perdido' and motivo_perda is null)),
  check ((proxima_acao_em is null and proxima_acao is null)
    or (proxima_acao_em is not null and proxima_acao is not null))
);
create index franquia_leads_unidade_etapa on public.franquia_leads(franquia_id, etapa, created_at desc);
create index franquia_leads_proxima_acao on public.franquia_leads(franquia_id, proxima_acao_em)
  where proxima_acao_em is not null;
create unique index franquia_leads_email_unico on public.franquia_leads(franquia_id, lower(btrim(email))) where email is not null;
create unique index franquia_leads_telefone_unico on public.franquia_leads(franquia_id, regexp_replace(telefone, '[^0-9]', '', 'g')) where telefone is not null;
alter table public.franquia_leads enable row level security;
revoke all on public.franquia_leads from public, anon, authenticated;
grant select, insert, update on public.franquia_leads to authenticated;
create policy "leads visiveis na unidade" on public.franquia_leads for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "cadastra lead na unidade" on public.franquia_leads for insert to authenticated
  with check ((franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador()) and etapa = 'lead' and criado_por = auth.uid());
create policy "atualiza lead na unidade" on public.franquia_leads for update to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador())
  with check (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

create table public.franquia_lead_etapas (
  id bigint generated always as identity primary key,
  franquia_id uuid not null,
  lead_id uuid not null,
  turma_id uuid,
  etapa_anterior text,
  etapa_nova text not null,
  ator uuid references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (franquia_id, lead_id) references public.franquia_leads(franquia_id, id),
  foreign key (franquia_id, turma_id) references public.franquia_turmas(franquia_id, id)
);
create index franquia_lead_etapas_mes on public.franquia_lead_etapas(franquia_id, etapa_nova, created_at desc);
alter table public.franquia_lead_etapas enable row level security;
revoke all on public.franquia_lead_etapas from public, anon, authenticated;
grant select on public.franquia_lead_etapas to authenticated;
create policy "historico visivel na unidade" on public.franquia_lead_etapas for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

create or replace function public.franquia_lead_registra_etapa()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.franquia_lead_etapas(franquia_id, lead_id, turma_id, etapa_anterior, etapa_nova, ator)
    values(new.franquia_id, new.id, new.turma_id, null, new.etapa, auth.uid());
  elsif new.etapa is distinct from old.etapa then
    insert into public.franquia_lead_etapas(franquia_id, lead_id, turma_id, etapa_anterior, etapa_nova, ator)
    values(new.franquia_id, new.id, new.turma_id, old.etapa, new.etapa, auth.uid());
  end if;
  return new;
end;
$$;
-- Imutabilidade precisa ser verificada antes da escrita. O histórico, após.
create or replace function public.franquia_lead_verifica_escopo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.franquia_id <> old.franquia_id or new.criado_por is distinct from old.criado_por then
    raise exception 'unidade e criador do lead são imutáveis';
  end if;
  return new;
end;
$$;
create trigger trg_lead_escopo before update on public.franquia_leads
  for each row execute function public.franquia_lead_verifica_escopo();
create trigger trg_lead_updated_at before update on public.franquia_leads
  for each row execute function public.franquia_set_updated_at();
create trigger trg_lead_etapas after insert or update on public.franquia_leads
  for each row execute function public.franquia_lead_registra_etapa();

create table public.franquia_metas_turma (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null,
  turma_id uuid not null,
  competencia date not null check (extract(day from competencia) = 1),
  meta_matriculas integer not null check (meta_matriculas between 0 and 10000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (franquia_id, turma_id, competencia),
  foreign key (franquia_id, turma_id) references public.franquia_turmas(franquia_id, id)
);
alter table public.franquia_metas_turma enable row level security;
revoke all on public.franquia_metas_turma from public, anon, authenticated;
grant select, insert, update on public.franquia_metas_turma to authenticated;
create policy "metas visiveis na unidade" on public.franquia_metas_turma for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "franqueador cria metas" on public.franquia_metas_turma for insert to authenticated
  with check (public.franquia_is_franqueador());
create policy "franqueador edita metas" on public.franquia_metas_turma for update to authenticated
  using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());
create trigger trg_metas_updated_at before update on public.franquia_metas_turma
  for each row execute function public.franquia_set_updated_at();
create trigger trg_metas_audit after insert or update on public.franquia_metas_turma
  for each row execute function public.franquia_audit_trigger();

commit;
