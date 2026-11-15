-- Atribuição de origem nos leads de expansão (UTM, fbclid, gclid, referrer).
--
-- Por quê agora: até aqui a captura só gravava origem='captura' sem saber
-- QUAL campanha/anúncio trouxe o lead. Esse dado só existe no instante do
-- clique -- se não for gravado na hora, não tem como reconstruir depois.
-- Com tráfego pago prestes a ligar (11 Digital Strategy), gravar isso desde
-- já é o que vai permitir, no futuro, calcular CPL e CAC por campanha real
-- em vez de só o agregado diário que já existe em franquia_expansao_campanhas.
--
-- Colunas soltas (não dentro de dados_extras) de propósito: é o que permite
-- filtrar e agrupar por campanha depois, sem expressão jsonb em toda query.
alter table public.franquia_expansao_leads
  add column utm_source text,
  add column utm_medium text,
  add column utm_campaign text,
  add column utm_content text,
  add column utm_term text,
  add column fbclid text,
  add column gclid text,
  add column referrer_host text,
  add column landing_path text;

-- Limites generosos pra token de clique (fbclid/gclid chegam a ~150-200
-- caracteres), curtos pro resto. Tudo opcional: lead manual, WhatsApp
-- orgânico e indicação continuam sem nenhum desses campos.
alter table public.franquia_expansao_leads
  add constraint franquia_expansao_leads_utm_source_check check (utm_source is null or length(utm_source) between 1 and 120),
  add constraint franquia_expansao_leads_utm_medium_check check (utm_medium is null or length(utm_medium) between 1 and 120),
  add constraint franquia_expansao_leads_utm_campaign_check check (utm_campaign is null or length(utm_campaign) between 1 and 160),
  add constraint franquia_expansao_leads_utm_content_check check (utm_content is null or length(utm_content) between 1 and 160),
  add constraint franquia_expansao_leads_utm_term_check check (utm_term is null or length(utm_term) between 1 and 160),
  add constraint franquia_expansao_leads_fbclid_check check (fbclid is null or length(fbclid) between 1 and 255),
  add constraint franquia_expansao_leads_gclid_check check (gclid is null or length(gclid) between 1 and 255),
  add constraint franquia_expansao_leads_referrer_host_check check (referrer_host is null or length(referrer_host) between 1 and 255),
  add constraint franquia_expansao_leads_landing_path_check check (landing_path is null or length(landing_path) between 1 and 255);

-- Índice parcial: só interessa filtrar/agrupar por campanha quando ela existe.
create index franquia_expansao_leads_utm_campaign on public.franquia_expansao_leads(utm_campaign) where utm_campaign is not null;

-- RLS e GRANT da tabela já cobrem as colunas novas automaticamente (são
-- políticas de linha, não de coluna) -- nenhuma mudança de permissão aqui.
