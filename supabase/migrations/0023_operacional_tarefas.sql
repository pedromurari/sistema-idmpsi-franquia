-- Modulo 6 do ROADMAP.md: operacional da equipe, parte 1 (kanban de tarefas).
-- Controle de ponto e base de conhecimento ficam pra uma rodada 2.
--
-- Limite conhecido herdado de 0001: franquia_profiles so e legivel pelo
-- proprio dono ou pelo franqueador ("so franqueador gerencia perfis") --
-- franqueado (dono da unidade) nao consegue resolver nome de outro membro
-- da propria equipe. Por isso "responsavel" so pode ser preenchido como "eu
-- mesmo" (qualquer papel) ou, quando quem cria e franqueador, um vendedor da
-- lista que ele ja enxerga em Comercial. Mesma limitacao que o modulo
-- Comercial ja tem hoje -- nao e novidade desta migration.
begin;

create table public.franquia_tarefas (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  titulo text not null check (length(btrim(titulo)) between 2 and 160),
  descricao text check (descricao is null or length(btrim(descricao)) <= 2000),
  responsavel_id uuid references auth.users(id),
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluida')),
  prazo date,
  criado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index franquia_tarefas_unidade_status on public.franquia_tarefas(franquia_id, status, prazo);
create index franquia_tarefas_responsavel on public.franquia_tarefas(franquia_id, responsavel_id) where responsavel_id is not null;

alter table public.franquia_tarefas enable row level security;
revoke all on public.franquia_tarefas from public, anon, authenticated;
grant select, insert, update on public.franquia_tarefas to authenticated;

create policy "tarefas visiveis na unidade" on public.franquia_tarefas for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

create policy "cadastra tarefa na unidade" on public.franquia_tarefas for insert to authenticated
  with check (
    (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador())
    and not public.franquia_is_vendedor()
    and criado_por = auth.uid()
  );

-- Vendedor so mexe nas proprias tarefas (responsavel_id = ele); franqueado e
-- franqueador mexem em qualquer tarefa da unidade.
create policy "atualiza tarefa na unidade" on public.franquia_tarefas for update to authenticated
  using (
    public.franquia_is_franqueador()
    or (
      franquia_id = public.franquia_minha_unidade()
      and (not public.franquia_is_vendedor() or responsavel_id = auth.uid())
    )
  )
  with check (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

-- Vendedor so pode mudar o status da propria tarefa, nunca titulo/descricao/
-- responsavel/prioridade/prazo -- mesma logica de "so franqueador confirma
-- venda" (0019), adaptada pra papel de vendedor.
create or replace function public.franquia_tarefa_verifica_escopo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.franquia_id <> old.franquia_id or new.criado_por is distinct from old.criado_por then
    raise exception 'unidade e criador da tarefa são imutáveis';
  end if;
  if public.franquia_is_vendedor() and not public.franquia_is_franqueador() then
    if new.titulo <> old.titulo or new.descricao is distinct from old.descricao
      or new.responsavel_id is distinct from old.responsavel_id
      or new.prioridade <> old.prioridade or new.prazo is distinct from old.prazo then
      raise exception 'vendedor só pode atualizar o status da própria tarefa';
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_tarefa_escopo before update on public.franquia_tarefas
  for each row execute function public.franquia_tarefa_verifica_escopo();
create trigger trg_tarefa_updated_at before update on public.franquia_tarefas
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_tarefas after insert or update on public.franquia_tarefas
  for each row execute function public.franquia_audit_trigger();

commit;
