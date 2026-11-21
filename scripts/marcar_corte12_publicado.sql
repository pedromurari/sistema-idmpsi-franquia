-- Corte 12 foi publicado no Instagram da franquia em 17/11/2026.
update public.franquia_social_posts set
  status = 'publicado',
  data_publicacao = '2026-11-17',
  observacoes = observacoes || E'\nPublicado no Instagram em 17/11/2026: https://www.instagram.com/p/Df2Gb-7hwsG/'
where escopo = 'franqueadora' and categoria = 'corte'
  and titulo = 'Corte 12 · Empresa sem procedimento (conta esquecida)';
