-- Categoria de conteúdo do social mídia: corte / longo (YouTube) / anúncio.
--
-- Por quê: `tipo` já existe, mas descreve o FORMATO (reel, carrossel, story,
-- post) -- não distingue um corte curto de um vídeo longo de YouTube ou de um
-- vídeo de anúncio. Sem essa distinção não dá pra filtrar o quadro por
-- "só longos" ou "só anúncios", que é exatamente o que Pedro pediu.
--
-- Default 'corte' preserva os registros existentes (todos cortes até aqui)
-- sem precisar de backfill manual.
alter table public.franquia_social_posts
  add column categoria text not null default 'corte' check (categoria in ('corte', 'longo', 'anuncio'));

create index franquia_social_posts_categoria on public.franquia_social_posts(escopo, categoria, data_publicacao);

-- RLS e GRANT da tabela já são por linha (não por coluna) -- nenhuma mudança
-- de permissão necessária para a coluna nova.
