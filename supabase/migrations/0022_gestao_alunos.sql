-- Modulo 2 do ROADMAP.md (parte 1): ficha do aluno + vagas/lista de espera.
-- Fica fora de escopo aqui: frequencia, evasao automatica, documentos/contratos
-- digitais e regua de relacionamento -- ficam pra uma rodada 2, como o
-- proprio roadmap ja previa.
begin;

-- franquia_vendas (0019) nao tinha unique(franquia_id, id) -- so a PK simples.
-- Precisa pra a FK composta abaixo poder referenciar (franquia_id, venda_id)
-- e barrar cross-unit mesmo numa escrita administrativa.
alter table public.franquia_vendas add constraint franquia_vendas_franquia_id_id_key unique (franquia_id, id);

create table public.franquia_alunos (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null references public.franquias(id),
  lead_id uuid,
  venda_id uuid,
  turma_id uuid,
  nome text not null check (length(btrim(nome)) between 2 and 160),
  cpf text check (cpf is null or length(regexp_replace(cpf, '[^0-9]', '', 'g')) = 11),
  email text check (email is null or (length(btrim(email)) between 5 and 254 and position('@' in email) > 1)),
  telefone text check (telefone is null or length(regexp_replace(telefone, '[^0-9]', '', 'g')) between 8 and 15),
  data_nascimento date,
  endereco text check (endereco is null or length(btrim(endereco)) <= 300),
  -- lista_espera cobre "vagas" do roadmap sem precisar de tabela/posicao
  -- separada -- e so mais um valor de status.
  status text not null default 'ativo' check (status in ('lista_espera', 'ativo', 'trancado', 'formado', 'desistente')),
  data_matricula date not null default ((now() at time zone 'America/Sao_Paulo')::date),
  data_conclusao_prevista date,
  motivo_status text,
  observacoes text,
  criado_por uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (franquia_id, lead_id) references public.franquia_leads(franquia_id, id),
  foreign key (franquia_id, venda_id) references public.franquia_vendas(franquia_id, id),
  foreign key (franquia_id, turma_id) references public.franquia_turmas(franquia_id, id),
  check (email is not null or telefone is not null),
  check ((status in ('trancado', 'desistente') and nullif(btrim(motivo_status), '') is not null)
    or (status not in ('trancado', 'desistente') and motivo_status is null))
);

-- No maximo uma ficha por lead (nao duplica o mesmo aluno ao reabrir o funil).
create unique index franquia_alunos_lead_unico on public.franquia_alunos(franquia_id, lead_id) where lead_id is not null;
create unique index franquia_alunos_cpf_unico on public.franquia_alunos(franquia_id, regexp_replace(cpf, '[^0-9]', '', 'g')) where cpf is not null;
create index franquia_alunos_unidade_status on public.franquia_alunos(franquia_id, status, nome);
create index franquia_alunos_turma on public.franquia_alunos(franquia_id, turma_id) where turma_id is not null;

alter table public.franquia_alunos enable row level security;
revoke all on public.franquia_alunos from public, anon, authenticated;
grant select, insert, update on public.franquia_alunos to authenticated;

-- Aluno matriculado deixa de ser "do vendedor que vendeu" e passa a ser da
-- unidade inteira (secretaria/coordenacao cuidam da ficha, nao so quem vendeu),
-- por isso a visibilidade aqui e por unidade, sem a restricao extra que leads
-- e vendas tem pra vendedor.
create policy "alunos visiveis na unidade" on public.franquia_alunos for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

-- Vendedor fecha a venda mas nao mexe na ficha academica/administrativa do
-- aluno -- isso e franqueado (dono da unidade) ou franqueador.
create policy "cadastra aluno na unidade" on public.franquia_alunos for insert to authenticated
  with check (
    (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador())
    and not public.franquia_is_vendedor()
    and criado_por = auth.uid()
  );
create policy "atualiza aluno na unidade" on public.franquia_alunos for update to authenticated
  using ((franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador()) and not public.franquia_is_vendedor())
  with check (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

create or replace function public.franquia_aluno_verifica_escopo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.franquia_id <> old.franquia_id or new.lead_id is distinct from old.lead_id
    or new.venda_id is distinct from old.venda_id or new.criado_por is distinct from old.criado_por then
    raise exception 'unidade, lead, venda e criador do aluno são imutáveis';
  end if;
  return new;
end;
$$;
create trigger trg_aluno_escopo before update on public.franquia_alunos
  for each row execute function public.franquia_aluno_verifica_escopo();

-- Capacidade da turma (franquia_turmas.capacidade) vira limite de verdade:
-- nao deixa ativar um aluno numa turma ja lotada. Turma sem capacidade
-- definida (null) continua sem limite, como hoje.
create or replace function public.franquia_aluno_verifica_vaga()
returns trigger language plpgsql set search_path = public as $$
declare
  v_capacidade integer;
  v_ocupados integer;
begin
  if new.turma_id is null or new.status <> 'ativo' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.turma_id is not distinct from new.turma_id and old.status = 'ativo' then
    return new;
  end if;
  select capacidade into v_capacidade from public.franquia_turmas
    where franquia_id = new.franquia_id and id = new.turma_id;
  if v_capacidade is null then
    return new;
  end if;
  select count(*) into v_ocupados from public.franquia_alunos
    where franquia_id = new.franquia_id and turma_id = new.turma_id and status = 'ativo' and id <> new.id;
  if v_ocupados >= v_capacidade then
    raise exception 'turma sem vagas disponíveis (capacidade %)', v_capacidade;
  end if;
  return new;
end;
$$;
create trigger trg_aluno_vaga before insert or update on public.franquia_alunos
  for each row execute function public.franquia_aluno_verifica_vaga();

create trigger trg_aluno_updated_at before update on public.franquia_alunos
  for each row execute function public.franquia_set_updated_at();
create trigger trg_audit_alunos after insert or update on public.franquia_alunos
  for each row execute function public.franquia_audit_trigger();

commit;
