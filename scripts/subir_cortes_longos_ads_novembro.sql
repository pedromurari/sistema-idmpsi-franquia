-- Cards do Drive de novembro/2026 (pasta "IDM PSI - vídeos" compartilhada por
-- Pedro em 15/11): 3 subpastas Ads, Cortes, Longos.
--
-- IMPORTANTE -- o que este script NÃO faz: não escreve legenda nem título
-- "de verdade" nenhum. Quem assistiu e escreveu os nomes dos arquivos foi o
-- editor; os títulos abaixo vêm só daí. Não há transcrição automática neste
-- ambiente, então nenhuma legenda foi inventada -- ela fica vazia, com a
-- observação pedindo pra alguém assistir e escrever. Mesma regra que já
-- valia pros cortes de outubro (ver docs/SOCIAL_MIDIA.md).
--
-- Requer a migration 0026_social_categoria.sql já aplicada.
begin;

-- 1) Corte 11 e Corte 12 já existiam como placeholder vazio (criados em
-- 02/10, aguardando vídeo -- ver scripts/planejar_2_cortes_pendentes.sql).
-- O vídeo do Corte 11 (série "Além do Consultório") finalmente chegou.
-- Assume-se que esse é o "11º já publicado" que o Pedro mencionou -- SEM
-- data real de publicação (não inventada aqui; falta ele informar).
update public.franquia_social_posts set
  titulo = 'Corte 11 · Além do Consultório (abertura da série)',
  media_url = 'https://drive.google.com/file/d/1izhe8S3pRSbIg6rweJApp32p5PzQRWLx/view?usp=drivesdk',
  status = 'revisao',
  data_publicacao = null, hora_publicacao = null,
  observacoes = 'Vídeo vinculado em 15/11. Pedro sinalizou que já foi publicado -- falta confirmar ONDE e QUANDO pra registrar certo, e escrever a legenda (ninguém assistiu o vídeo inteiro ainda).'
where escopo = 'franqueadora' and titulo = 'Corte 11' and categoria = 'corte' and (media_url is null or media_url = '');

-- Corte 12: usando o arquivo com o nome mais específico de conteúdo
-- (idm-corte7, ver observação abaixo sobre a renumeração dos 6 novos).
update public.franquia_social_posts set
  titulo = 'Corte 12 · Empresa sem procedimento (conta esquecida)',
  media_url = 'https://drive.google.com/file/d/1H9fcOSHx7UJt-oUX6pwJcTfzlm3q_Smb/view?usp=drivesdk',
  status = 'revisao',
  data_publicacao = null, hora_publicacao = null,
  observacoes = 'Vídeo vinculado em 15/11. Falta assistir e escrever a legenda.'
where escopo = 'franqueadora' and titulo = 'Corte 12' and categoria = 'corte' and (media_url is null or media_url = '');

-- 2) Cortes 13 a 17: os outros 5 vídeos "idm-corteN" do Drive, sem relação
-- com o número final -- o nome de arquivo do editor (idm-corte8, 9, 10, 11,
-- 12) é só a numeração interna dele, não a sequência de publicação. Ordem
-- abaixo é a única disponível (ordem crescente do próprio nome do editor);
-- SE a ordem de publicação pretendida for outra, é só trocar o título.
insert into public.franquia_social_posts
  (escopo, titulo, tipo, categoria, status, media_url, observacoes, criado_por)
select 'franqueadora', item.titulo, 'reel', 'corte', 'revisao', item.media_url,
  'Vídeo vinculado em 15/11. Falta assistir e escrever a legenda.', adm.user_id
from (values
  ('Corte 13 · Faturamento x prosperidade', 'https://drive.google.com/file/d/107Jj79nSCRsYNwu1Amoq3pozlNCSCIif/view?usp=drivesdk'),
  ('Corte 14 · Empresário fatura menos, mas sobra mais', 'https://drive.google.com/file/d/1_mQR7a8BZElDxCA9GlHSFiKUAhuTpu7h/view?usp=drivesdk'),
  ('Corte 15 · 3 dias afastado do consultório', 'https://drive.google.com/file/d/1IgA1nz34ZS1hzxJ5B1vlfpeSi2DHFWxM/view?usp=drivesdk'),
  ('Corte 16 · Reserva financeira (segurança na empresa)', 'https://drive.google.com/file/d/17k-HS4T43kF5j_iFfYAiii8grQb6VOt2/view?usp=drivesdk'),
  ('Corte 17 · Crescimento escalável (mentalidade empresarial)', 'https://drive.google.com/file/d/1LkqblyoHdPbqPmN1waBQZgUB_Vm-sNUI/view?usp=drivesdk')
) as item(titulo, media_url)
cross join lateral (
  select user_id from public.franquia_user_roles
  where role = 'franqueador' order by created_at limit 1
) as adm
where not exists (
  select 1 from public.franquia_social_posts existente
  where existente.escopo = 'franqueadora' and existente.titulo = item.titulo
);

-- 3) Longos (YouTube): numeração 01-06 é a do próprio Pedro (sequência de
-- publicação definida por ele) -- preservada igual. Só o vídeo 01 tem nome
-- que diz do que se trata; 02 a 06 vieram só como "youtube1/2/3" e
-- "2-parte1/2" -- nome de exportação do editor, sem pista de conteúdo.
-- Título fica como placeholder explícito até alguém assistir.
insert into public.franquia_social_posts
  (escopo, titulo, tipo, categoria, status, media_url, observacoes, criado_por)
select 'franqueadora', item.titulo, 'post', 'longo', 'revisao', item.media_url, item.obs, adm.user_id
from (values
  ('Longo 01 · Além do Consultório - episódio completo (16min)',
   'https://drive.google.com/file/d/1Ok0TWs-PkTEuzAqZejsMYSBZ9RDF7jna/view?usp=drivesdk',
   'Vídeo vinculado em 15/11. Falta assistir e escrever título de YouTube, descrição e legenda de divulgação.'),
  ('Longo 02 · (título a definir -- assistir vídeo)',
   'https://drive.google.com/file/d/1IsPoKnnsRPBTPWfSRgurs29c0UqF8fsE/view?usp=drivesdk',
   'Arquivo chegou só como "youtube1", sem pista de conteúdo no nome. Precisa assistir pra saber do que trata antes de criar título/legenda.'),
  ('Longo 03 · (título a definir -- assistir vídeo)',
   'https://drive.google.com/file/d/191lcXF1QcTdeNMc_9JsDoJ2pcQW9_pGW/view?usp=drivesdk',
   'Arquivo chegou só como "youtube2", sem pista de conteúdo no nome. Precisa assistir pra saber do que trata antes de criar título/legenda.'),
  ('Longo 04 · (título a definir -- assistir vídeo)',
   'https://drive.google.com/file/d/1gUJ0FCgFjXgkWU9DPknjsva-iZ6k_o_Y/view?usp=drivesdk',
   'Arquivo chegou só como "youtube3", sem pista de conteúdo no nome. Precisa assistir pra saber do que trata antes de criar título/legenda.'),
  ('Longo 05 · (título a definir -- Parte 1 de 2)',
   'https://drive.google.com/file/d/1SbdGVtFiX3yOTfXRvvOiBQf7sUp2mciT/view?usp=drivesdk',
   'Arquivo chegou como "2-parte1", parece ser a parte 1 de um vídeo dividido em dois. Precisa assistir pra saber do que trata.'),
  ('Longo 06 · (título a definir -- Parte 2 de 2)',
   'https://drive.google.com/file/d/1-pP2GPRzs6FQPGHlxLXudK0G8ePhOmJS/view?usp=drivesdk',
   'Arquivo chegou como "2-parte2", parece ser a parte 2 do vídeo anterior. Precisa assistir pra saber do que trata.')
) as item(titulo, media_url, obs)
cross join lateral (
  select user_id from public.franquia_user_roles
  where role = 'franqueador' order by created_at limit 1
) as adm
where not exists (
  select 1 from public.franquia_social_posts existente
  where existente.escopo = 'franqueadora' and existente.titulo = item.titulo
);

-- 4) Ads: só 1 vídeo, categoria própria, não entra no quadro de Cortes/Longos.
insert into public.franquia_social_posts
  (escopo, titulo, tipo, categoria, status, media_url, observacoes, criado_por)
select 'franqueadora', 'Anúncio · Convite a investidor - reunião estratégica IDM PSI',
  'reel', 'anuncio', 'revisao',
  'https://drive.google.com/file/d/1yyckrSuhhoJJU02FpkbJ10F-5iUOqLMD/view?usp=drivesdk',
  'Vídeo vinculado em 15/11. Falta assistir e escrever o texto do anúncio.', adm.user_id
from (
  select user_id from public.franquia_user_roles
  where role = 'franqueador' order by created_at limit 1
) as adm
where not exists (
  select 1 from public.franquia_social_posts existente
  where existente.escopo = 'franqueadora' and existente.categoria = 'anuncio'
    and existente.titulo = 'Anúncio · Convite a investidor - reunião estratégica IDM PSI'
);

commit;
