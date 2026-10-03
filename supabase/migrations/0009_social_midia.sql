-- Calendário editorial da franqueadora e das unidades, com escopos separados.
begin;

create table public.franquia_social_posts (
  id uuid primary key default gen_random_uuid(),
  escopo text not null check (escopo in ('franqueadora', 'unidade')),
  franquia_id uuid references public.franquias(id),
  titulo text not null check (length(btrim(titulo)) between 2 and 160),
  legenda text not null default '' check (length(legenda) <= 5000),
  tipo text not null default 'reel' check (tipo in ('reel', 'carrossel', 'story', 'post')),
  status text not null default 'planejado' check (status in ('planejado', 'criacao', 'revisao', 'aprovado', 'agendado', 'publicado')),
  data_publicacao date,
  media_url text check (media_url is null or (length(media_url) <= 2000 and media_url ~ '^https://')),
  observacoes text not null default '' check (length(observacoes) <= 5000),
  criado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint social_escopo_unidade check
    ((escopo = 'franqueadora' and franquia_id is null) or
     (escopo = 'unidade' and franquia_id is not null))
);
create index franquia_social_posts_escopo_data on public.franquia_social_posts
  (escopo, franquia_id, data_publicacao, id);
alter table public.franquia_social_posts enable row level security;
revoke all on public.franquia_social_posts from public, anon, authenticated;
grant select, insert, update, delete on public.franquia_social_posts to authenticated;

create policy "social leitura por escopo" on public.franquia_social_posts
  for select to authenticated using (
    public.franquia_is_franqueador() or
    (escopo = 'unidade' and franquia_id = public.franquia_minha_unidade())
  );
create policy "social cadastro por escopo" on public.franquia_social_posts
  for insert to authenticated with check (
    criado_por = auth.uid() and
    (public.franquia_is_franqueador() or
     (escopo = 'unidade' and franquia_id = public.franquia_minha_unidade()))
  );
create policy "social edicao por escopo" on public.franquia_social_posts
  for update to authenticated using (
    public.franquia_is_franqueador() or
    (escopo = 'unidade' and franquia_id = public.franquia_minha_unidade())
  ) with check (
    public.franquia_is_franqueador() or
    (escopo = 'unidade' and franquia_id = public.franquia_minha_unidade())
  );
create policy "social exclusao por escopo" on public.franquia_social_posts
  for delete to authenticated using (
    public.franquia_is_franqueador() or
    (escopo = 'unidade' and franquia_id = public.franquia_minha_unidade())
  );
create trigger trg_social_posts_updated_at before update on public.franquia_social_posts
  for each row execute function public.franquia_set_updated_at();

commit;
