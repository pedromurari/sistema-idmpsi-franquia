-- Completa a quarta semana da cadência de três cortes por semana.
insert into public.franquia_social_posts
  (escopo, titulo, tipo, status, data_publicacao, observacoes, criado_por)
select 'franqueadora', item.titulo, 'reel', 'planejado', item.data_publicacao,
  'Vídeo ainda não recebido; vincular arquivo e preparar legenda quando chegar.', adm.user_id
from (values
  ('Corte 11', date '2026-10-28'),
  ('Corte 12', date '2026-10-30')
) as item(titulo, data_publicacao)
cross join lateral (
  select user_id from public.franquia_user_roles
  where role = 'franqueador' order by created_at limit 1
) as adm
where not exists (
  select 1 from public.franquia_social_posts existente
  where existente.escopo = 'franqueadora'
    and existente.titulo = item.titulo
    and existente.data_publicacao = item.data_publicacao
);
