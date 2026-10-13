-- Histórico de conversa de WhatsApp por lead (franquia_leads). Toda escrita
-- passa por edge function com service_role -- nunca inserida direto do
-- navegador: a mensagem "enviada" precisa chamar a Evolution API antes de
-- existir, e a "recebida" vem do webhook, sem sessão de usuário por trás.
-- Por isso authenticated só tem select aqui, sem grant de insert/update/delete.
begin;

create table public.franquia_lead_mensagens (
  id uuid primary key default gen_random_uuid(),
  franquia_id uuid not null,
  lead_id uuid not null,
  direcao text not null check (direcao in ('enviada', 'recebida')),
  conteudo text not null check (length(btrim(conteudo)) between 1 and 4096),
  remetente uuid references auth.users(id),
  evolution_message_id text,
  created_at timestamptz not null default now(),
  foreign key (franquia_id, lead_id) references public.franquia_leads(franquia_id, id)
);
create index franquia_lead_mensagens_historico
  on public.franquia_lead_mensagens(franquia_id, lead_id, created_at desc);
-- Evita duplicar mensagem quando a Evolution reenvia o mesmo webhook.
create unique index franquia_lead_mensagens_evolution_id_unico
  on public.franquia_lead_mensagens(evolution_message_id) where evolution_message_id is not null;

alter table public.franquia_lead_mensagens enable row level security;
revoke all on public.franquia_lead_mensagens from public, anon, authenticated;
grant select on public.franquia_lead_mensagens to authenticated;

create policy "mensagens visiveis na unidade" on public.franquia_lead_mensagens
  for select to authenticated
  using (franquia_id = public.franquia_minha_unidade() or public.franquia_is_franqueador());

commit;
