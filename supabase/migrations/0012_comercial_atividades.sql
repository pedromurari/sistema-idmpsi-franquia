-- Registro imutável de contatos e notas dos leads da unidade. Executar após 0011.
begin;

create table public.franquia_lead_atividades (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null,
  lead_id uuid not null,
  tipo text not null check (tipo in ('ligacao', 'nota')),
  resultado text check (resultado in ('atendeu', 'nao_atendeu', 'sem_resposta')),
  nota text check (nota is null or length(btrim(nota)) between 1 and 2000),
  ator uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  foreign key (franquia_id, lead_id) references public.franquia_leads(franquia_id, id),
  check ((tipo = 'ligacao' and resultado is not null) or (tipo = 'nota' and resultado is null and nota is not null))
);
create index franquia_lead_atividades_historico
  on public.franquia_lead_atividades(franquia_id, lead_id, created_at desc);
alter table public.franquia_lead_atividades enable row level security;
revoke all on public.franquia_lead_atividades from public, anon, authenticated;
grant select on public.franquia_lead_atividades to authenticated;
grant insert (franquia_id, lead_id, tipo, resultado, nota) on public.franquia_lead_atividades to authenticated;
create policy "atividades visiveis na unidade" on public.franquia_lead_atividades
  for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "registra atividade na unidade" on public.franquia_lead_atividades
  for insert to authenticated
  with check ((franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador())
    and ator = auth.uid());
create trigger trg_lead_atividade_audit after insert on public.franquia_lead_atividades
  for each row execute function public.franquia_audit_trigger();

commit;
