-- Planejamento inicial autorizado pelo Pedro: três cortes por semana,
-- segunda/quarta/sexta, a partir de 05/10/2026. Não publica nas redes.
insert into public.franquia_social_posts
  (escopo, titulo, tipo, status, data_publicacao, observacoes, criado_por)
select 'franqueadora', 'Corte ' || lpad(serie.n::text, 2, '0'), 'reel', 'planejado',
  date '2026-10-05' + ((serie.n - 1) / 3) * 7 +
    case (serie.n - 1) % 3 when 0 then 0 when 1 then 2 else 4 end,
  'Aguardando vínculo com o vídeo do Google Drive e a legenda.',
  adm.user_id
from generate_series(1, 10) as serie(n)
cross join lateral (
  select user_id from public.franquia_user_roles
  where role = 'franqueador' order by created_at limit 1
) as adm
where not exists (
  select 1 from public.franquia_social_posts existente
  where existente.escopo = 'franqueadora'
    and existente.titulo = 'Corte ' || lpad(serie.n::text, 2, '0')
    and existente.data_publicacao = date '2026-10-05' + ((serie.n - 1) / 3) * 7 +
      case (serie.n - 1) % 3 when 0 then 0 when 1 then 2 else 4 end
);
