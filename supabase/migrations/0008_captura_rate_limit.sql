-- Limite de envio da captura pública, sem expor os dados ou o controle à API anônima.
begin;

-- A função pública usa service_role; a tabela de leads foi criada sem esse GRANT.
grant insert on public.franquia_expansao_leads to service_role;

create table public.franquia_captura_rate_limits (
  chave text primary key check (chave ~ '^(ip|contato):[0-9a-f]{64}$'),
  janela_inicio timestamptz not null default now(),
  envios integer not null default 1 check (envios > 0)
);
alter table public.franquia_captura_rate_limits enable row level security;
revoke all on public.franquia_captura_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.franquia_captura_rate_limits to service_role;

create function public.franquia_captura_admitir(p_ip_hash text, p_contato_hash text)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_ip_hash !~ '^[0-9a-f]{64}$' or p_contato_hash !~ '^[0-9a-f]{64}$'
    or p_ip_hash is null or p_contato_hash is null then
    return false;
  end if;

  insert into public.franquia_captura_rate_limits (chave) values ('ip:' || p_ip_hash)
  on conflict (chave) do update set
    janela_inicio = case when franquia_captura_rate_limits.janela_inicio <= now() - interval '1 hour'
      then now() else franquia_captura_rate_limits.janela_inicio end,
    envios = case when franquia_captura_rate_limits.janela_inicio <= now() - interval '1 hour'
      then 1 else franquia_captura_rate_limits.envios + 1 end
  where franquia_captura_rate_limits.janela_inicio <= now() - interval '1 hour'
     or franquia_captura_rate_limits.envios < 20;
  if not found then return false; end if;

  insert into public.franquia_captura_rate_limits (chave) values ('contato:' || p_contato_hash)
  on conflict (chave) do update set
    janela_inicio = case when franquia_captura_rate_limits.janela_inicio <= now() - interval '1 day'
      then now() else franquia_captura_rate_limits.janela_inicio end,
    envios = case when franquia_captura_rate_limits.janela_inicio <= now() - interval '1 day'
      then 1 else franquia_captura_rate_limits.envios + 1 end
  where franquia_captura_rate_limits.janela_inicio <= now() - interval '1 day'
     or franquia_captura_rate_limits.envios < 3;
  return found;
end;
$$;
revoke all on function public.franquia_captura_admitir(text, text) from public, anon, authenticated;
grant execute on function public.franquia_captura_admitir(text, text) to service_role;

commit;
