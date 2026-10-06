-- Horário editorial local de Brasília. Não aciona publicação automática.
begin;

alter table public.franquia_social_posts
  add column hora_publicacao time without time zone;

comment on column public.franquia_social_posts.hora_publicacao is
  'Hora planejada em America/Sao_Paulo; publicação nas redes sociais permanece manual.';

commit;
