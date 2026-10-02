-- O projeto remoto herdou TRUNCATE/REFERENCES/TRIGGER nos papéis da API.
-- TRUNCATE não passa por RLS nem pela auditoria por linha. O aplicativo
-- precisa apenas dos grants SELECT/INSERT/UPDATE/DELETE definidos nas policies.
begin;

revoke all privileges on table
  public.franquias,
  public.franquia_profiles,
  public.franquia_user_roles,
  public.franquia_dre_lancamentos,
  public.franquia_notas_fiscais,
  public.franquia_audit_log,
  public.franquia_turmas,
  public.franquia_royalties_regras
from authenticated, anon, public;

grant select, insert, update on public.franquias, public.franquia_profiles,
  public.franquia_turmas, public.franquia_royalties_regras to authenticated;
grant select, insert, update, delete on public.franquia_user_roles,
  public.franquia_dre_lancamentos, public.franquia_notas_fiscais to authenticated;
grant select on public.franquia_audit_log to authenticated;

-- Migrations executadas como postgres também não devem herdar esses grants.
alter default privileges for role postgres in schema public
  revoke all privileges on tables from authenticated, anon, public;

commit;
