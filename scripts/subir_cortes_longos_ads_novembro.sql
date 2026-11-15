-- Cards do Drive de novembro/2026 (pasta compartilhada em 15/11): Ads,
-- Cortes, Longos. Legendas escritas a partir da TRANSCRIÇÃO real do áudio de
-- cada vídeo (Whisper local, rodado nesta máquina -- nenhum vídeo saiu daqui).
-- Ninguém "assistiu" no sentido humano; a transcrição foi lida e virou texto
-- de legenda no mesmo estilo dos cortes de outubro. Ainda assim, FICA COMO
-- 'revisao' -- pede uma conferência humana antes de aprovar/agendar.
--
-- Script seguro pra rodar de novo: se você já rodou uma versão anterior
-- (com legenda vazia), este aqui completa a legenda que faltava sem duplicar
-- nada nem apagar texto que você já tenha editado manualmente.
--
-- Longos ainda não entram aqui -- a transcrição deles (vídeos de 1-2h) ainda
-- está rodando; vem num script separado.
--
-- Requer a migration 0026_social_categoria.sql já aplicada.
begin;

-- 1) Corte 11: vídeo "Além do Consultório - abertura da série", o que Pedro
-- disse já estar publicado. Reaproveita o card vazio "Corte 11" (criado em
-- 02/10, nunca recebeu vídeo). SEM data de publicação real -- não inventada
-- aqui, falta confirmar onde/quando.
update public.franquia_social_posts set
  titulo = 'Corte 11 · Além do Consultório (abertura da série)',
  media_url = 'https://drive.google.com/file/d/1izhe8S3pRSbIg6rweJApp32p5PzQRWLx/view?usp=drivesdk',
  status = 'revisao', data_publicacao = null, hora_publicacao = null,
  legenda = 'Nasce uma nova série: Além do Consultório. 🎙️

Pra você que é terapeuta, psicanalista, psicólogo ou profissional da saúde mental: essa série é sobre resultado — não só sobre cuidar de pessoas, mas sobre crescer com o que você sabe fazer.

A saúde mental deixou de ser só profissão. 16,3 milhões de brasileiros declararam diagnóstico de depressão em 2019, e o cenário só se agravou depois da pandemia. É o que no mundo dos negócios chamamos de Oceano Azul: um mercado que ainda tem muito espaço pra crescer.

Foi enxergando essa oportunidade que nasceu o Instituto Despertamente — e hoje, a franquia que leva esse modelo adiante, pra você não ficar refém de uma agenda de atendimentos um a um.

Você quer continuar só atendendo, ou quer escalar o que você sabe fazer?',
  observacoes = 'Legenda gerada a partir da transcrição real do áudio (Whisper local) em 15/11. Pedro sinalizou que esse corte já foi publicado -- falta confirmar ONDE e QUANDO pra registrar a data certa. Revisar o texto antes de aprovar.'
where escopo = 'franqueadora' and categoria = 'corte' and titulo in ('Corte 11', 'Corte 11 · Além do Consultório (abertura da série)')
  and (legenda is null or btrim(legenda) = '');

-- Corte 12: vídeo idm-corte7 "Empresa sem procedimento".
update public.franquia_social_posts set
  titulo = 'Corte 12 · Empresa sem procedimento (conta esquecida)',
  media_url = 'https://drive.google.com/file/d/1H9fcOSHx7UJt-oUX6pwJcTfzlm3q_Smb/view?usp=drivesdk',
  status = 'revisao',
  legenda = 'Já esqueceu de pagar uma conta da empresa e só foi lembrar dias depois? 📋

Não é falta de atenção — é falta de procedimento bem definido. Quando isso vira rotina, mês após mês, o problema não é mais pontual: é estrutural, e é isso que você vai colher lá na frente.

Desorganização plantada hoje vira prejuízo colhido amanhã.

A sua empresa já tem processo pra isso, ou ainda depende da sua memória?',
  observacoes = 'Legenda gerada a partir da transcrição real do áudio (Whisper local) em 15/11. Revisar antes de aprovar.'
where escopo = 'franqueadora' and categoria = 'corte' and titulo in ('Corte 12', 'Corte 12 · Empresa sem procedimento (conta esquecida)')
  and (legenda is null or btrim(legenda) = '');

-- 2) Cortes 13 a 17: os outros 5 vídeos "idm-corteN" do Drive (numeração do
-- editor, sem relação com a ordem final de publicação).
insert into public.franquia_social_posts
  (escopo, titulo, tipo, categoria, status, media_url, legenda, observacoes, criado_por)
select 'franqueadora', item.titulo, 'reel', 'corte', 'revisao', item.media_url, item.legenda,
  'Legenda gerada a partir da transcrição real do áudio (Whisper local) em 15/11. Revisar antes de aprovar.', adm.user_id
from (values
  ('Corte 13 · Faturamento x prosperidade',
   'https://drive.google.com/file/d/107Jj79nSCRsYNwu1Amoq3pozlNCSCIif/view?usp=drivesdk',
   'Faturar bem não é o mesmo que prosperar. 💰

Fechar o caixa no fim do mês e ver receita entrando é bom. Mas prosperar é mais que isso: é ter resultado depois das despesas, é construir uma base que sustenta crescimento de verdade — não só girar dinheiro.

Bom, ótimo, excelente: qual desses descreve o seu negócio hoje?

O que você escolhe pra ele daqui pra frente?'),
  ('Corte 14 · Empresário fatura menos, mas sobra mais',
   'https://drive.google.com/file/d/1_mQR7a8BZElDxCA9GlHSFiKUAhuTpu7h/view?usp=drivesdk',
   'Quem fatura mais nem sempre ganha mais. 📊

Um empresário fatura R$ 10 mil e gasta R$ 20 mil. Outro fatura R$ 2 mil e gasta R$ 1 mil. No fim do mês, quem sobra dinheiro é o segundo — o outro fecha no vermelho, mesmo faturando cinco vezes mais.

Faturamento alto sem controle de gasto é ilusão de resultado.

Você sabe, de cabeça, quanto sobra da sua empresa no fim do mês — ou só sabe quanto entra?'),
  ('Corte 15 · 3 dias afastado do consultório',
   'https://drive.google.com/file/d/1IgA1nz34ZS1hzxJ5B1vlfpeSi2DHFWxM/view?usp=drivesdk',
   'Se você se afastasse só 3 dias do seu negócio, como seria a volta? 🏖️

Tem profissional que tira alguns dias, desliga de tudo e, quando volta, encontra o caos — meses de organização desfeitos em poucos dias de ausência. Se o seu negócio depende inteiramente de você estar presente, ele não é bem um negócio: é um emprego que você deu a si mesmo.

Sua operação aguenta a sua ausência, ou trava sem você?'),
  ('Corte 16 · Reserva financeira (segurança na empresa)',
   'https://drive.google.com/file/d/17k-HS4T43kF5j_iFfYAiii8grQb6VOt2/view?usp=drivesdk',
   'Empresa brasileira tem um ponto cego: reserva financeira. 🛡️

A gente não tem o hábito de pensar em segurança financeira — nem na vida pessoal, nem na empresa. Na pandemia isso ficou escancarado: muito negócio que parecia sólido quebrou por não ter reserva pra atravessar o imprevisto. Não importa se a empresa tem 2 meses ou 10 anos — sem isso, ela pode cair.

O mínimo pra estar preparado? Aguentar pelo menos 6 meses de receita baixa sem desmontar a operação.

A sua empresa resistiria a 6 meses de aperto?'),
  ('Corte 17 · Crescimento escalável (mentalidade empresarial)',
   'https://drive.google.com/file/d/1LkqblyoHdPbqPmN1waBQZgUB_Vm-sNUI/view?usp=drivesdk',
   'Se você não está crescendo, está morrendo. 🚀

Crescer de verdade não é trabalhar mais — é transformar o seu jeito técnico em metodologia, a sua habilidade em algo que se multiplica sem depender só de você. É isso que separa quem decide pelo próximo nível de quem decide pela zona de conforto.

Se você chegou à conclusão de que "está bom assim", a sua empresa já está indo pro buraco.

Você está construindo algo escalável, ou só repetindo o que já faz?')
) as item(titulo, media_url, legenda)
cross join lateral (
  select user_id from public.franquia_user_roles
  where role = 'franqueador' order by created_at limit 1
) as adm
where not exists (
  select 1 from public.franquia_social_posts existente
  where existente.escopo = 'franqueadora' and existente.titulo = item.titulo
);

-- Backfill de segurança: se uma versão anterior deste script (sem legenda)
-- já criou os Cortes 13-17, completa a legenda agora sem duplicar linha.
update public.franquia_social_posts p set legenda = item.legenda,
  observacoes = 'Legenda gerada a partir da transcrição real do áudio (Whisper local) em 15/11. Revisar antes de aprovar.'
from (values
  ('Corte 13 · Faturamento x prosperidade',
   'Faturar bem não é o mesmo que prosperar. 💰

Fechar o caixa no fim do mês e ver receita entrando é bom. Mas prosperar é mais que isso: é ter resultado depois das despesas, é construir uma base que sustenta crescimento de verdade — não só girar dinheiro.

Bom, ótimo, excelente: qual desses descreve o seu negócio hoje?

O que você escolhe pra ele daqui pra frente?'),
  ('Corte 14 · Empresário fatura menos, mas sobra mais',
   'Quem fatura mais nem sempre ganha mais. 📊

Um empresário fatura R$ 10 mil e gasta R$ 20 mil. Outro fatura R$ 2 mil e gasta R$ 1 mil. No fim do mês, quem sobra dinheiro é o segundo — o outro fecha no vermelho, mesmo faturando cinco vezes mais.

Faturamento alto sem controle de gasto é ilusão de resultado.

Você sabe, de cabeça, quanto sobra da sua empresa no fim do mês — ou só sabe quanto entra?'),
  ('Corte 15 · 3 dias afastado do consultório',
   'Se você se afastasse só 3 dias do seu negócio, como seria a volta? 🏖️

Tem profissional que tira alguns dias, desliga de tudo e, quando volta, encontra o caos — meses de organização desfeitos em poucos dias de ausência. Se o seu negócio depende inteiramente de você estar presente, ele não é bem um negócio: é um emprego que você deu a si mesmo.

Sua operação aguenta a sua ausência, ou trava sem você?'),
  ('Corte 16 · Reserva financeira (segurança na empresa)',
   'Empresa brasileira tem um ponto cego: reserva financeira. 🛡️

A gente não tem o hábito de pensar em segurança financeira — nem na vida pessoal, nem na empresa. Na pandemia isso ficou escancarado: muito negócio que parecia sólido quebrou por não ter reserva pra atravessar o imprevisto. Não importa se a empresa tem 2 meses ou 10 anos — sem isso, ela pode cair.

O mínimo pra estar preparado? Aguentar pelo menos 6 meses de receita baixa sem desmontar a operação.

A sua empresa resistiria a 6 meses de aperto?'),
  ('Corte 17 · Crescimento escalável (mentalidade empresarial)',
   'Se você não está crescendo, está morrendo. 🚀

Crescer de verdade não é trabalhar mais — é transformar o seu jeito técnico em metodologia, a sua habilidade em algo que se multiplica sem depender só de você. É isso que separa quem decide pelo próximo nível de quem decide pela zona de conforto.

Se você chegou à conclusão de que "está bom assim", a sua empresa já está indo pro buraco.

Você está construindo algo escalável, ou só repetindo o que já faz?')
) as item(titulo, legenda)
where p.escopo = 'franqueadora' and p.titulo = item.titulo and (p.legenda is null or btrim(p.legenda) = '');

-- 3) Ads: 1 vídeo, categoria própria.
insert into public.franquia_social_posts
  (escopo, titulo, tipo, categoria, status, media_url, legenda, observacoes, criado_por)
select 'franqueadora', 'Anúncio · Convite a investidor - reunião estratégica IDM PSI',
  'reel', 'anuncio', 'revisao',
  'https://drive.google.com/file/d/1yyckrSuhhoJJU02FpkbJ10F-5iUOqLMD/view?usp=drivesdk',
  'Seu dinheiro está trabalhando por você, ou só parado? 💼

Apresentamos um modelo de negócio pra colocar capital em movimento: uma franquia presencial no mercado de desenvolvimento humano, saúde mental e emocional, com estrutura, metodologia e suporte — e até 5 fontes de renda em um só negócio.

Agende uma reunião estratégica gratuita pra conhecer o projeto, entender o investimento e a operação, e decidir se faz sentido pra você.',
  'Legenda/texto gerado a partir da transcrição real do áudio (Whisper local) em 15/11. Revisar antes de aprovar -- é anúncio, confirmar claim de "5 fontes de renda" e termos antes de publicar.', adm.user_id
from (
  select user_id from public.franquia_user_roles
  where role = 'franqueador' order by created_at limit 1
) as adm
where not exists (
  select 1 from public.franquia_social_posts existente
  where existente.escopo = 'franqueadora' and existente.categoria = 'anuncio'
    and existente.titulo = 'Anúncio · Convite a investidor - reunião estratégica IDM PSI'
);

update public.franquia_social_posts set
  legenda = 'Seu dinheiro está trabalhando por você, ou só parado? 💼

Apresentamos um modelo de negócio pra colocar capital em movimento: uma franquia presencial no mercado de desenvolvimento humano, saúde mental e emocional, com estrutura, metodologia e suporte — e até 5 fontes de renda em um só negócio.

Agende uma reunião estratégica gratuita pra conhecer o projeto, entender o investimento e a operação, e decidir se faz sentido pra você.',
  observacoes = 'Legenda/texto gerado a partir da transcrição real do áudio (Whisper local) em 15/11. Revisar antes de aprovar -- é anúncio, confirmar claim de "5 fontes de renda" e termos antes de publicar.'
where escopo = 'franqueadora' and categoria = 'anuncio'
  and titulo = 'Anúncio · Convite a investidor - reunião estratégica IDM PSI'
  and (legenda is null or btrim(legenda) = '');

commit;
