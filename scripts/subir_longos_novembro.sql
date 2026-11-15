-- Os 6 vídeos "Longos" (YouTube) da pasta do Drive de novembro/2026, já
-- numerados por Pedro (longo01..longo06) pra sequência de publicação.
-- Títulos, descrições (campo legenda) e legendas escritos a partir da
-- TRANSCRIÇÃO real do áudio de cada vídeo (Whisper local, rodado nesta
-- máquina -- nenhum vídeo saiu daqui). Ninguém "assistiu" no sentido humano;
-- a transcrição foi lida e virou texto. Fica como 'revisao' -- pede
-- conferência humana antes de aprovar/agendar, sobretudo pra confirmar se a
-- ordem de publicação 3/4 não deveria ser invertida (ver observação abaixo).
--
-- Script seguro pra rodar de novo: completa o que faltar sem duplicar linha
-- nem apagar texto que você já tenha editado manualmente.
--
-- Requer a migration 0026_social_categoria.sql já aplicada.
begin;

insert into public.franquia_social_posts
  (escopo, titulo, tipo, categoria, status, media_url, legenda, observacoes, criado_por)
select 'franqueadora', item.titulo, 'post', 'longo', 'revisao', item.media_url, item.legenda, item.observacoes, adm.user_id
from (values
  ('Além do Consultório #1 · Por que a Saúde Mental é um Oceano Azul para Empreender',
   'https://drive.google.com/file/d/1Ok0TWs-PkTEuzAqZejsMYSBZ9RDF7jna/view?usp=drivesdk',
   'Estreia da série Além do Consultório. 🎙️

Rodrigo Murari e Marcos Salvucci abrem uma conversa sobre o que vem depois do conhecimento técnico: como quem cuida de gente também pode construir um negócio que cresce.

A saúde mental deixou de ser só profissão. 16,3 milhões de brasileiros declararam diagnóstico de depressão em 2019, e o quadro se agravou na pós-pandemia — mais ansiedade, mais afastamentos do trabalho, mais dependência das telas. É o que no mundo dos negócios chamamos de Oceano Azul: um mercado gigante, ainda pouco disputado.

Foi enxergando essa oportunidade, em plena pandemia, que Marcos fez até 16 atendimentos num só sábado — e percebeu que precisava escalar. Daí nasceu o Instituto Despertamente, e agora a franquia que leva esse modelo para a sua cidade: IDM PSI.

Você que é terapeuta, psicanalista, psicólogo ou profissional da saúde mental: vai continuar só atendendo, ou vai escalar o que você sabe fazer?

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. Esse é o episódio completo de onde foi recortado o "Corte 11 · Além do Consultório (abertura da série)". Revisar antes de aprovar.'),

  ('Além do Consultório #2 · A Empada da Dona Francisca: por que ser bom profissional não garante um bom negócio',
   'https://drive.google.com/file/d/1IsPoKnnsRPBTPWfSRgurs29c0UqF8fsE/view?usp=drivesdk',
   'Ser um excelente profissional não garante um negócio saudável. 🥟

Rodrigo e Marcos contam duas histórias reais: a empada da Dona Francisca (um produto incrível, mas sem visão de negócio) e o brigadeiro de uma amiga que vendia cada vez mais... e lucrava cada vez menos, porque esquecia de contar o frete no preço.

E tem dado: segundo o SEBRAE, 95% dos negócios abertos por conta própria fecham em 5 anos. Entre quem entra numa franquia estruturada, é quase o inverso — perto de 90% seguem de pé no mesmo período.

Também falamos do teto da precificação por hora (R$ 250, R$ 350, R$ 500 a sessão) e por que, trocando tempo por dinheiro, sempre existe um limite. Agenda cheia pode ser sucesso profissional. Sozinha, não é um negócio estruturado.

Se o seu consultório fosse só o começo, o que você construiria depois dele?

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. Revisar antes de aprovar.'),

  ('Além do Consultório #3 · Os 5 Níveis de Liderança para Escalar seu Consultório',
   'https://drive.google.com/file/d/191lcXF1QcTdeNMc_9JsDoJ2pcQW9_pGW/view?usp=drivesdk',
   'Os 5 níveis de liderança que separam quem atende sozinho de quem constrói um negócio escalável. 🪜

1. Liderar a si mesmo — antes de liderar uma equipe, aprenda a liberar sua própria execução.
2. Liderar pessoas — delegar não é abandonar, é transferir responsabilidade com clareza, acompanhamento e feedback.
3. Liderar processos — sem metodologia, você não delega: improvisa.
4. Liderar líderes — a diferença entre ter gente trabalhando para você e ter uma estrutura de liderança.
5. Liderar uma visão — o nível de legado, quando seu negócio passa a ter propósito além do lucro.

E o teste que Marcos propõe: se você desaparecesse do seu negócio por uma semana, ele continuaria de pé? Se a resposta te incomoda, é sinal de que falta liderança — e é exatamente isso que uma franquia estruturada já entrega pronto.

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. ATENÇÃO Pedro: pelo conteúdo, este vídeo parece ser a CONTINUAÇÃO direta do #4 (que termina com "vamos falar de cinco níveis de liderança, podemos?" e este começa direto no assunto, sem saudação). Pode valer inverter a ordem de publicação de #3 e #4 -- confirmar antes de agendar.'),

  ('Além do Consultório #4 · Chefe Manda, Líder Lidera: a competência que leva seu negócio além do consultório',
   'https://drive.google.com/file/d/1gUJ0FCgFjXgkWU9DPknjsva-iZ6k_o_Y/view?usp=drivesdk',
   'A competência que levou você até o consultório não é, necessariamente, a competência que vai levar seu negócio além dele. 🧭

Rodrigo e Marcos falam sobre a virada de chave entre ser um excelente profissional e se tornar um líder: por que "dar ordem" não é liderar, e por que quem trata a equipe como "tribo" manda — quem trata como time, lidera.

Marcos conta como viu, na prática, médicos exaustos por não saberem escalar o próprio consultório: iam no limite físico, emocional e financeiro, porque o negócio dependia 100% deles.

Quanto mais indispensável você é, menos escalável o seu negócio se torna. A escala começa quando o conhecimento deixa de morar só na cabeça de quem fundou.

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. Ver observação no #3: este episódio termina com um "gancho" pros 5 níveis de liderança que o #3 desenvolve direto na sequência -- considerar publicar o #3 logo depois deste. Revisar antes de aprovar.'),

  ('Além do Consultório #5 · Agenda Cheia, Conta Bancária Vazia: os 5 Pilares da Clínica Financeiramente Sustentável (parte 1)',
   'https://drive.google.com/file/d/1SbdGVtFiX3yOTfXRvvOiBQf7sUp2mciT/view?usp=drivesdk',
   'Agenda cheia, conta bancária vazia — você já sentiu isso? 💸

Faturar não é o mesmo que prosperar. Nessa parte 1 (de 2), Rodrigo e Marcos apresentam os 3 primeiros dos 5 pilares de uma clínica financeiramente sustentável:

1. Visibilidade financeira — o "escotoma financeiro" que faz você achar que faturou muito e, no fim, descobrir que ficou no vermelho.
2. Previsibilidade de receita — trabalhar com metas baseadas no seu histórico, não no que você gostaria de faturar.
3. Processos e organização — o que te deixa vulnerável a um caos se você precisar se afastar só 3 dias.

Na parte 2, fechamos com segurança financeira, capacidade de crescimento e um teste rápido de 5 perguntas pra você descobrir se sua clínica prospera ou só sobrevive.

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. O próprio vídeo se identifica como "a quarta edição" da série -- a numeração #5 aqui segue a ordem de publicação que Pedro definiu pelos nomes de arquivo, não necessariamente a ordem de gravação. Revisar antes de aprovar.'),

  ('Além do Consultório #6 · Reserva Financeira, Capacidade de Crescimento e o Teste: sua clínica prospera ou sobrevive? (parte 2)',
   'https://drive.google.com/file/d/1-pP2GPRzs6FQPGHlxLXudK0G8ePhOmJS/view?usp=drivesdk',
   'Parte 2: os 2 últimos pilares da clínica financeiramente sustentável — e o teste que mostra onde você está. 🧮

4. Segurança financeira — ter reserva pra aguentar pelo menos 6 meses de receita baixa sem quebrar.
5. Capacidade de crescimento — crescer não pode depender só de colocar mais horas na agenda.

No final, um diagnóstico rápido de 5 perguntas (0, 1 ou 2 pontos cada) pra você descobrir se sua clínica está vulnerável, estruturando-se ou já com fundamentos sólidos de gestão.

Se seu negócio ainda depende 100% de você estar presente todos os dias, talvez seja hora de conhecer um modelo pronto.

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI — a franquia da escola presencial de saúde mental e emocional.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. Continuação direta do #5 (mesma gravação, parte 2). Revisar antes de aprovar.')
) as item(titulo, media_url, legenda, observacoes)
cross join lateral (
  select user_id from public.franquia_user_roles
  where role = 'franqueador' order by created_at limit 1
) as adm
where not exists (
  select 1 from public.franquia_social_posts existente
  where existente.escopo = 'franqueadora' and existente.categoria = 'longo' and existente.titulo = item.titulo
);

-- Backfill de segurança: se uma versão anterior deste script já criou as
-- linhas (ex.: só com título, sem legenda), completa sem duplicar nada.
update public.franquia_social_posts p set
  media_url = item.media_url, legenda = item.legenda, observacoes = item.observacoes
from (values
  ('Além do Consultório #1 · Por que a Saúde Mental é um Oceano Azul para Empreender',
   'https://drive.google.com/file/d/1Ok0TWs-PkTEuzAqZejsMYSBZ9RDF7jna/view?usp=drivesdk',
   'Estreia da série Além do Consultório. 🎙️

Rodrigo Murari e Marcos Salvucci abrem uma conversa sobre o que vem depois do conhecimento técnico: como quem cuida de gente também pode construir um negócio que cresce.

A saúde mental deixou de ser só profissão. 16,3 milhões de brasileiros declararam diagnóstico de depressão em 2019, e o quadro se agravou na pós-pandemia — mais ansiedade, mais afastamentos do trabalho, mais dependência das telas. É o que no mundo dos negócios chamamos de Oceano Azul: um mercado gigante, ainda pouco disputado.

Foi enxergando essa oportunidade, em plena pandemia, que Marcos fez até 16 atendimentos num só sábado — e percebeu que precisava escalar. Daí nasceu o Instituto Despertamente, e agora a franquia que leva esse modelo para a sua cidade: IDM PSI.

Você que é terapeuta, psicanalista, psicólogo ou profissional da saúde mental: vai continuar só atendendo, ou vai escalar o que você sabe fazer?

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. Esse é o episódio completo de onde foi recortado o "Corte 11 · Além do Consultório (abertura da série)". Revisar antes de aprovar.'),

  ('Além do Consultório #2 · A Empada da Dona Francisca: por que ser bom profissional não garante um bom negócio',
   'https://drive.google.com/file/d/1IsPoKnnsRPBTPWfSRgurs29c0UqF8fsE/view?usp=drivesdk',
   'Ser um excelente profissional não garante um negócio saudável. 🥟

Rodrigo e Marcos contam duas histórias reais: a empada da Dona Francisca (um produto incrível, mas sem visão de negócio) e o brigadeiro de uma amiga que vendia cada vez mais... e lucrava cada vez menos, porque esquecia de contar o frete no preço.

E tem dado: segundo o SEBRAE, 95% dos negócios abertos por conta própria fecham em 5 anos. Entre quem entra numa franquia estruturada, é quase o inverso — perto de 90% seguem de pé no mesmo período.

Também falamos do teto da precificação por hora (R$ 250, R$ 350, R$ 500 a sessão) e por que, trocando tempo por dinheiro, sempre existe um limite. Agenda cheia pode ser sucesso profissional. Sozinha, não é um negócio estruturado.

Se o seu consultório fosse só o começo, o que você construiria depois dele?

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. Revisar antes de aprovar.'),

  ('Além do Consultório #3 · Os 5 Níveis de Liderança para Escalar seu Consultório',
   'https://drive.google.com/file/d/191lcXF1QcTdeNMc_9JsDoJ2pcQW9_pGW/view?usp=drivesdk',
   'Os 5 níveis de liderança que separam quem atende sozinho de quem constrói um negócio escalável. 🪜

1. Liderar a si mesmo — antes de liderar uma equipe, aprenda a liberar sua própria execução.
2. Liderar pessoas — delegar não é abandonar, é transferir responsabilidade com clareza, acompanhamento e feedback.
3. Liderar processos — sem metodologia, você não delega: improvisa.
4. Liderar líderes — a diferença entre ter gente trabalhando para você e ter uma estrutura de liderança.
5. Liderar uma visão — o nível de legado, quando seu negócio passa a ter propósito além do lucro.

E o teste que Marcos propõe: se você desaparecesse do seu negócio por uma semana, ele continuaria de pé? Se a resposta te incomoda, é sinal de que falta liderança — e é exatamente isso que uma franquia estruturada já entrega pronto.

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. ATENÇÃO Pedro: pelo conteúdo, este vídeo parece ser a CONTINUAÇÃO direta do #4 (que termina com "vamos falar de cinco níveis de liderança, podemos?" e este começa direto no assunto, sem saudação). Pode valer inverter a ordem de publicação de #3 e #4 -- confirmar antes de agendar.'),

  ('Além do Consultório #4 · Chefe Manda, Líder Lidera: a competência que leva seu negócio além do consultório',
   'https://drive.google.com/file/d/1gUJ0FCgFjXgkWU9DPknjsva-iZ6k_o_Y/view?usp=drivesdk',
   'A competência que levou você até o consultório não é, necessariamente, a competência que vai levar seu negócio além dele. 🧭

Rodrigo e Marcos falam sobre a virada de chave entre ser um excelente profissional e se tornar um líder: por que "dar ordem" não é liderar, e por que quem trata a equipe como "tribo" manda — quem trata como time, lidera.

Marcos conta como viu, na prática, médicos exaustos por não saberem escalar o próprio consultório: iam no limite físico, emocional e financeiro, porque o negócio dependia 100% deles.

Quanto mais indispensável você é, menos escalável o seu negócio se torna. A escala começa quando o conhecimento deixa de morar só na cabeça de quem fundou.

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. Ver observação no #3: este episódio termina com um "gancho" pros 5 níveis de liderança que o #3 desenvolve direto na sequência -- considerar publicar o #3 logo depois deste. Revisar antes de aprovar.'),

  ('Além do Consultório #5 · Agenda Cheia, Conta Bancária Vazia: os 5 Pilares da Clínica Financeiramente Sustentável (parte 1)',
   'https://drive.google.com/file/d/1SbdGVtFiX3yOTfXRvvOiBQf7sUp2mciT/view?usp=drivesdk',
   'Agenda cheia, conta bancária vazia — você já sentiu isso? 💸

Faturar não é o mesmo que prosperar. Nessa parte 1 (de 2), Rodrigo e Marcos apresentam os 3 primeiros dos 5 pilares de uma clínica financeiramente sustentável:

1. Visibilidade financeira — o "escotoma financeiro" que faz você achar que faturou muito e, no fim, descobrir que ficou no vermelho.
2. Previsibilidade de receita — trabalhar com metas baseadas no seu histórico, não no que você gostaria de faturar.
3. Processos e organização — o que te deixa vulnerável a um caos se você precisar se afastar só 3 dias.

Na parte 2, fechamos com segurança financeira, capacidade de crescimento e um teste rápido de 5 perguntas pra você descobrir se sua clínica prospera ou só sobrevive.

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. O próprio vídeo se identifica como "a quarta edição" da série -- a numeração #5 aqui segue a ordem de publicação que Pedro definiu pelos nomes de arquivo, não necessariamente a ordem de gravação. Revisar antes de aprovar.'),

  ('Além do Consultório #6 · Reserva Financeira, Capacidade de Crescimento e o Teste: sua clínica prospera ou sobrevive? (parte 2)',
   'https://drive.google.com/file/d/1-pP2GPRzs6FQPGHlxLXudK0G8ePhOmJS/view?usp=drivesdk',
   'Parte 2: os 2 últimos pilares da clínica financeiramente sustentável — e o teste que mostra onde você está. 🧮

4. Segurança financeira — ter reserva pra aguentar pelo menos 6 meses de receita baixa sem quebrar.
5. Capacidade de crescimento — crescer não pode depender só de colocar mais horas na agenda.

No final, um diagnóstico rápido de 5 perguntas (0, 1 ou 2 pontos cada) pra você descobrir se sua clínica está vulnerável, estruturando-se ou já com fundamentos sólidos de gestão.

Se seu negócio ainda depende 100% de você estar presente todos os dias, talvez seja hora de conhecer um modelo pronto.

Clique no link da descrição e marque uma reunião estratégica gratuita para conhecer o modelo de franquia IDM PSI — a franquia da escola presencial de saúde mental e emocional.',
   'Título/descrição gerados a partir da transcrição real do áudio (Whisper local) em 15/11. Continuação direta do #5 (mesma gravação, parte 2). Revisar antes de aprovar.')
) as item(titulo, media_url, legenda, observacoes)
where p.escopo = 'franqueadora' and p.categoria = 'longo' and p.titulo = item.titulo
  and (p.legenda is null or btrim(p.legenda) = '');

commit;
