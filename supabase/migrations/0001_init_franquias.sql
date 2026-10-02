-- ============================================================================
-- Sistema do Franqueador (IDM PSI) — schema inicial
--
-- Modelo de dados: multi-tenant por `franquia_id`. Cada franqueado só enxerga
-- as linhas da própria unidade; o franqueador (ADM geral) enxerga tudo.
-- O isolamento é garantido por RLS no banco -- nunca confiar em lógica do
-- front pra esconder dado de outra unidade.
-- ============================================================================

-- ── Papéis e helpers ────────────────────────────────────────────────────────

create table if not exists public.franquias (
  id                   uuid primary key default gen_random_uuid(),
  nome                 text not null,
  cidade               text,
  estado               text,
  cnpj                 text,
  responsavel_nome     text,
  responsavel_email    text,
  data_inauguracao     date,
  ativo                boolean not null default true,
  created_at           timestamptz not null default now()
);

-- Espelha auth.users (1:1) -- não dá pra usar RLS direto em auth.users.
create table if not exists public.franquia_profiles (
  id                   uuid primary key references auth.users(id) on delete cascade,
  nome                 text not null,
  email                text not null,
  -- NULL = franqueador (vê tudo). Obrigatório pra franqueado (ver trigger abaixo
  -- e o bloqueio em AuthContext.tsx caso passe por aqui sem valor).
  franquia_id          uuid references public.franquias(id),
  ativo                boolean not null default true,
  created_at           timestamptz not null default now()
);

create table if not exists public.franquia_user_roles (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  role                 text not null check (role in ('franqueador', 'franqueado')),
  created_at           timestamptz not null default now()
);

-- Trava a nível de banco (não só no front): franqueado tem que ter franquia_id.
create or replace function public.franquia_valida_vinculo()
returns trigger
language plpgsql
as $$
begin
  if exists (
    select 1 from public.franquia_user_roles
    where user_id = new.id and role = 'franqueado'
  ) and new.franquia_id is null then
    raise exception 'franqueado precisa estar vinculado a uma franquia_id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_franquia_valida_vinculo on public.franquia_profiles;
create trigger trg_franquia_valida_vinculo
  before insert or update on public.franquia_profiles
  for each row execute function public.franquia_valida_vinculo();

-- SECURITY DEFINER + search_path fixo: é o jeito recomendado pelo Supabase de
-- checar papel dentro de uma policy sem recursão nem risco de search_path
-- hijacking (ver aviso de segurança do linter do Supabase).
create or replace function public.franquia_is_franqueador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.franquia_user_roles
    where user_id = auth.uid() and role = 'franqueador'
  );
$$;

create or replace function public.franquia_minha_unidade()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select franquia_id from public.franquia_profiles where id = auth.uid();
$$;

-- ── Dados financeiros por unidade ───────────────────────────────────────────

create table if not exists public.franquia_dre_lancamentos (
  id                   uuid primary key default gen_random_uuid(),
  franquia_id          uuid not null references public.franquias(id),
  competencia          date not null,              -- sempre dia 1 do mês de referência
  tipo                 text not null check (tipo in ('receita', 'despesa')),
  categoria            text not null,
  descricao            text,
  valor                numeric(12,2) not null check (valor >= 0),
  criado_por           uuid references auth.users(id),
  created_at           timestamptz not null default now()
);

create index if not exists idx_dre_franquia_competencia on public.franquia_dre_lancamentos (franquia_id, competencia);

create table if not exists public.franquia_notas_fiscais (
  id                   uuid primary key default gen_random_uuid(),
  franquia_id          uuid not null references public.franquias(id),
  numero               text,
  valor                numeric(12,2) not null check (valor >= 0),
  status               text not null default 'pendente' check (status in ('pendente', 'emitida', 'cancelada')),
  competencia          date not null,
  data_emissao         date,
  link_pdf             text,
  solicitado_por       uuid references auth.users(id),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists idx_nf_franquia on public.franquia_notas_fiscais (franquia_id, competencia);

create or replace function public.franquia_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_nf_updated_at on public.franquia_notas_fiscais;
create trigger trg_nf_updated_at
  before update on public.franquia_notas_fiscais
  for each row execute function public.franquia_set_updated_at();

-- ── Trilha de auditoria ──────────────────────────────────────────────────
-- Dado financeiro/fiscal de terceiro: toda alteração fica registrada com quem
-- fez e quando. Só o franqueador consegue ler (ver policy abaixo).

create table if not exists public.franquia_audit_log (
  id                   bigint generated always as identity primary key,
  tabela               text not null,
  registro_id          uuid not null,
  acao                 text not null check (acao in ('insert', 'update', 'delete')),
  ator                 uuid references auth.users(id),
  dados_antigos        jsonb,
  dados_novos          jsonb,
  created_at           timestamptz not null default now()
);

create or replace function public.franquia_audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.franquia_audit_log (tabela, registro_id, acao, ator, dados_antigos, dados_novos)
  values (
    tg_table_name,
    coalesce(new.id, old.id),
    lower(tg_op),
    auth.uid(),
    case when tg_op in ('update', 'delete') then to_jsonb(old) else null end,
    case when tg_op in ('insert', 'update') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_audit_dre on public.franquia_dre_lancamentos;
create trigger trg_audit_dre
  after insert or update or delete on public.franquia_dre_lancamentos
  for each row execute function public.franquia_audit_trigger();

drop trigger if exists trg_audit_nf on public.franquia_notas_fiscais;
create trigger trg_audit_nf
  after insert or update or delete on public.franquia_notas_fiscais
  for each row execute function public.franquia_audit_trigger();

-- ── RLS ──────────────────────────────────────────────────────────────────
-- Regra geral em todas as tabelas: RLS ligado, sem exceção, nenhuma delas é
-- de leitura pública. O service_role (edge functions) sempre ignora RLS --
-- é por isso que a emissão real de nota (integração externa) deve rodar como
-- edge function, nunca com a chave anon direto do navegador do franqueado.

alter table public.franquias enable row level security;
alter table public.franquia_profiles enable row level security;
alter table public.franquia_user_roles enable row level security;
alter table public.franquia_dre_lancamentos enable row level security;
alter table public.franquia_notas_fiscais enable row level security;
alter table public.franquia_audit_log enable row level security;

-- franquias
create policy "franqueador ve todas as unidades" on public.franquias
  for select using (public.franquia_is_franqueador());
create policy "franqueado ve a propria unidade" on public.franquias
  for select using (id = public.franquia_minha_unidade());
create policy "so franqueador cria/edita unidades" on public.franquias
  for all using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());

-- franquia_profiles
create policy "usuario ve o proprio perfil" on public.franquia_profiles
  for select using (id = auth.uid() or public.franquia_is_franqueador());
create policy "so franqueador gerencia perfis" on public.franquia_profiles
  for insert with check (public.franquia_is_franqueador());
create policy "so franqueador edita perfis" on public.franquia_profiles
  for update using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());

-- franquia_user_roles
create policy "usuario ve o proprio papel" on public.franquia_user_roles
  for select using (user_id = auth.uid() or public.franquia_is_franqueador());
create policy "so franqueador gerencia papeis" on public.franquia_user_roles
  for insert with check (public.franquia_is_franqueador());
create policy "so franqueador edita papeis" on public.franquia_user_roles
  for update using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());
create policy "so franqueador remove papeis" on public.franquia_user_roles
  for delete using (public.franquia_is_franqueador());

-- franquia_dre_lancamentos -- franqueado só lê (v1: DRE é informado pela
-- franqueadora, não lançado pelo próprio franqueado).
create policy "le lancamentos da propria unidade ou todas (franqueador)" on public.franquia_dre_lancamentos
  for select using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "so franqueador lanca dre" on public.franquia_dre_lancamentos
  for insert with check (public.franquia_is_franqueador());
create policy "so franqueador edita dre" on public.franquia_dre_lancamentos
  for update using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());
create policy "so franqueador apaga dre" on public.franquia_dre_lancamentos
  for delete using (public.franquia_is_franqueador());

-- franquia_notas_fiscais -- franqueado pode solicitar (insert) pra própria
-- unidade; só franqueador (ou edge function com service_role) atualiza status.
create policy "le notas da propria unidade ou todas (franqueador)" on public.franquia_notas_fiscais
  for select using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "franqueado solicita nota da propria unidade" on public.franquia_notas_fiscais
  for insert with check (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());
create policy "so franqueador edita notas" on public.franquia_notas_fiscais
  for update using (public.franquia_is_franqueador()) with check (public.franquia_is_franqueador());
create policy "so franqueador apaga notas" on public.franquia_notas_fiscais
  for delete using (public.franquia_is_franqueador());

-- franquia_audit_log -- só o franqueador lê; ninguém escreve direto (só o
-- trigger, que roda como SECURITY DEFINER e por isso ignora RLS na escrita).
create policy "so franqueador le auditoria" on public.franquia_audit_log
  for select using (public.franquia_is_franqueador());
