-- ============================================================================
-- GRANTs explícitos pro papel `authenticated`.
--
-- RLS (migration 0001) decide QUAIS LINHAS cada usuário vê; GRANT decide SE
-- o papel pode tocar na tabela/função. Como desativamos "Automatically expose
-- new tables" na criação do projeto (de propósito, por segurança), o Supabase
-- não criou os grants padrão -- sem isso, toda query dá "permission denied"
-- mesmo com a RLS certa.
-- ============================================================================

grant usage on schema public to authenticated;

grant select, insert, update on public.franquias to authenticated;
grant select on public.franquia_profiles to authenticated;
grant select on public.franquia_user_roles to authenticated;
grant select on public.franquia_dre_lancamentos to authenticated;
grant select, insert on public.franquia_notas_fiscais to authenticated;
-- franquia_audit_log: só leitura (a escrita é feita pelo trigger, que roda
-- como SECURITY DEFINER e não depende do grant do usuário logado).
grant select on public.franquia_audit_log to authenticated;

-- Insert/update de franquia_profiles e franquia_user_roles fica restrito ao
-- franqueador -- a RLS já bloqueia a linha, mas o INSERT/UPDATE na tabela
-- (não só SELECT) também precisa do grant, senão nem o franqueador consegue.
grant insert, update on public.franquia_profiles to authenticated;
grant insert, update, delete on public.franquia_user_roles to authenticated;
grant update, delete on public.franquia_dre_lancamentos to authenticated;
grant insert on public.franquia_dre_lancamentos to authenticated;
grant update, delete on public.franquia_notas_fiscais to authenticated;

grant execute on function public.franquia_is_franqueador() to authenticated;
grant execute on function public.franquia_minha_unidade() to authenticated;
