-- Caixa de sugestões da equipe (Rodrigo, Marcos e quem mais entrar).
-- Cada tela do portal tem um botão "Sugestão"; o texto fica registrado com a
-- tela de origem, o autor e um status que só a administração altera.
begin;

-- Usuário com perfil ativo, qualquer papel. Mesma ideia das outras funções de
-- acesso: JWT válido de conta desativada não passa.
create or replace function public.franquia_usuario_ativo()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.franquia_profiles p
    join public.franquia_user_roles r on r.user_id = p.id
    where p.id = auth.uid() and p.ativo
  );
$$;
revoke all on function public.franquia_usuario_ativo() from public, anon;
grant execute on function public.franquia_usuario_ativo() to authenticated;

create table public.franquia_sugestoes (
  id uuid primary key default gen_random_uuid(),
  autor_id uuid not null references auth.users(id),
  autor_nome text not null check (length(btrim(autor_nome)) between 1 and 160),
  -- Caminho da tela (sem parâmetros) e o nome do menu, como aparece pro usuário.
  rota text not null check (rota ~ '^/[a-z0-9/_-]{0,80}$'),
  area text not null check (length(btrim(area)) between 1 and 80),
  tipo text not null default 'melhoria' check (tipo in ('melhoria', 'problema', 'ideia')),
  texto text not null check (length(btrim(texto)) between 3 and 4000),
  status text not null default 'novo'
    check (status in ('novo', 'em_analise', 'em_andamento', 'feito', 'descartado')),
  resposta text check (resposta is null or length(btrim(resposta)) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_sugestoes_status on public.franquia_sugestoes (status, created_at desc);
create index idx_sugestoes_autor on public.franquia_sugestoes (autor_id, created_at desc);

-- Autor, nome, status e datas são definidos pelo banco: o navegador não escolhe
-- quem "escreveu" nem já manda a sugestão como "feita".
create or replace function public.franquia_sugestao_preenche()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.autor_id := auth.uid();
  new.autor_nome := (select p.nome from public.franquia_profiles p where p.id = auth.uid());
  new.status := 'novo';
  new.resposta := null;
  new.created_at := now();
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_sugestao_preenche before insert on public.franquia_sugestoes
  for each row execute function public.franquia_sugestao_preenche();
create trigger trg_sugestao_updated_at before update on public.franquia_sugestoes
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_sugestoes after insert or update or delete on public.franquia_sugestoes
  for each row execute function public.franquia_audit_trigger();

alter table public.franquia_sugestoes enable row level security;

create policy "le sugestoes proprias ou todas (franqueador)" on public.franquia_sugestoes
  for select to authenticated
  using (public.franquia_is_franqueador()
    or (autor_id = auth.uid() and public.franquia_usuario_ativo()));
create policy "usuario ativo envia sugestao" on public.franquia_sugestoes
  for insert to authenticated
  with check (autor_id = auth.uid() and public.franquia_usuario_ativo());
create policy "franqueador trata sugestoes" on public.franquia_sugestoes
  for update to authenticated
  using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());

-- GRANT por coluna: quem envia só informa tela, tipo e texto; só status e
-- resposta podem ser alterados depois (e a policy limita isso ao franqueador).
-- Sem DELETE: sugestão não some, só muda de status.
grant select on public.franquia_sugestoes to authenticated;
grant insert (rota, area, tipo, texto) on public.franquia_sugestoes to authenticated;
grant update (status, resposta) on public.franquia_sugestoes to authenticated;

commit;
