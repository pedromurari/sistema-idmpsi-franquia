-- Verificação somente leitura após 0003 e 0004.
begin read only;
do $$
declare
  tabela text;
begin
  foreach tabela in array array['franquias','franquia_profiles','franquia_user_roles',
    'franquia_dre_lancamentos','franquia_notas_fiscais','franquia_audit_log',
    'franquia_turmas','franquia_royalties_regras'] loop
    if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relname=tabela and c.relrowsecurity) then
      raise exception 'RLS ausente: %', tabela;
    end if;
    if not has_table_privilege('authenticated', 'public.' || tabela, 'SELECT') then
      raise exception 'SELECT ausente: %', tabela;
    end if;
    if has_table_privilege('authenticated', 'public.' || tabela, 'TRUNCATE')
      or has_table_privilege('authenticated', 'public.' || tabela, 'TRIGGER')
      or has_table_privilege('authenticated', 'public.' || tabela, 'REFERENCES')
      or has_table_privilege('anon', 'public.' || tabela, 'SELECT') then
      raise exception 'Grant excessivo: %', tabela;
    end if;
  end loop;
  foreach tabela in array array['franquia_turmas','franquia_royalties_regras'] loop
    if not has_table_privilege('authenticated', 'public.' || tabela, 'INSERT')
      or not has_table_privilege('authenticated', 'public.' || tabela, 'UPDATE') then
      raise exception 'Grant de escrita ausente: %', tabela;
    end if;
    if (select count(*) from pg_policies where schemaname='public' and tablename=tabela) <> 3 then
      raise exception 'Policies inesperadas: %', tabela;
    end if;
    if not exists (select 1 from pg_trigger where tgrelid=('public.' || tabela)::regclass
      and tgfoid='public.franquia_audit_trigger()'::regprocedure and not tgisinternal) then
      raise exception 'Auditoria ausente: %', tabela;
    end if;
  end loop;
  if not exists (select 1 from pg_constraint where conname='dre_turma_mesma_unidade'
    and conrelid='public.franquia_dre_lancamentos'::regclass and convalidated) then
    raise exception 'FK de unidade/turma ausente ou não validada';
  end if;
end;
$$;
select 'Estrutura, RLS, grants mínimos, policies, auditoria e FK verificados.' as resultado;
commit;
