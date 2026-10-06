-- Quadro de copies de anúncios da franqueadora, independente dos cortes.
begin;

create table public.franquia_social_copies (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(btrim(titulo)) between 2 and 160),
  briefing text not null default '' check (length(briefing) <= 5000),
  texto_anuncio text not null default '' check (length(texto_anuncio) <= 5000),
  chamada_acao text not null default '' check (length(chamada_acao) <= 300),
  referencia_url text check (referencia_url is null or
    (length(referencia_url) <= 2000 and referencia_url ~ '^https://')),
  prazo date,
  status text not null default 'pendente' check
    (status in ('pendente', 'criacao', 'revisao', 'aprovada', 'em_uso')),
  observacoes text not null default '' check (length(observacoes) <= 5000),
  criado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index franquia_social_copies_status_prazo on public.franquia_social_copies
  (status, prazo, id);
alter table public.franquia_social_copies enable row level security;
revoke all on public.franquia_social_copies from public, anon, authenticated;
grant select, insert on public.franquia_social_copies to authenticated;
grant update (titulo, briefing, texto_anuncio, chamada_acao, referencia_url,
  prazo, status, observacoes) on public.franquia_social_copies to authenticated;

create policy "copies leitura franqueadora" on public.franquia_social_copies
  for select to authenticated using (public.franquia_is_franqueador());
create policy "copies cadastro franqueadora" on public.franquia_social_copies
  for insert to authenticated with check
    (public.franquia_is_franqueador() and criado_por = auth.uid());
create policy "copies edicao franqueadora" on public.franquia_social_copies
  for update to authenticated using (public.franquia_is_franqueador())
  with check (public.franquia_is_franqueador());

create trigger trg_social_copies_updated_at before update on public.franquia_social_copies
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_social_copies after insert or update on public.franquia_social_copies
  for each row execute function public.franquia_audit_trigger();

commit;
