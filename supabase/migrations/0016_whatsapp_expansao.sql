-- Correção de escopo: o WhatsApp conectado (idm-franquia-01) é só da
-- franqueadora, pros leads de venda de franquia (franquia_expansao_leads) --
-- nunca pros leads de aluno de uma unidade (franquia_leads). A tabela
-- anterior nunca chegou a ter mensagem de verdade (criada no mesmo dia),
-- então troca limpa em vez de migração de dado.
begin;

drop table if exists public.franquia_lead_mensagens;

create table public.franquia_expansao_mensagens (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.franquia_expansao_leads(id),
  direcao text not null check (direcao in ('enviada', 'recebida')),
  conteudo text not null check (length(btrim(conteudo)) between 1 and 4096),
  remetente uuid references auth.users(id),
  evolution_message_id text,
  created_at timestamptz not null default now()
);
create index franquia_expansao_mensagens_historico
  on public.franquia_expansao_mensagens(lead_id, created_at desc);
create unique index franquia_expansao_mensagens_evolution_id_unico
  on public.franquia_expansao_mensagens(evolution_message_id) where evolution_message_id is not null;

alter table public.franquia_expansao_mensagens enable row level security;
revoke all on public.franquia_expansao_mensagens from public, anon, authenticated;
-- Só select pro navegador, igual o padrão anterior -- toda escrita passa por
-- edge function (enviar precisa da Evolution API key; receber não tem sessão
-- de usuário por trás, é webhook).
grant select on public.franquia_expansao_mensagens to authenticated;
create policy "adm le mensagens de expansao" on public.franquia_expansao_mensagens
  for select to authenticated using (public.franquia_is_franqueador());

commit;
