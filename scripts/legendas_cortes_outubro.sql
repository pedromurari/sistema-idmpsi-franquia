-- Legendas criadas a partir da transcrição dos vídeos originais do Drive.
-- Cada atualização mantém o vínculo do vídeo e é idempotente.
begin;

update public.franquia_social_posts
set legenda = 'Vender mais não é o mesmo que lucrar mais. 🍫

Uma empreendedora de brigadeiros viu as vendas crescerem, mas o dinheiro não sobrava. Ao examinar os custos e o DRE, apareceu o detalhe que faltava na conta: as entregas. Frete e aplicativos consumiam a margem.

Olhar para o negócio como um todo faz diferença. O suporte de uma franqueadora também ajuda a enxergar custos que passam despercebidos na rotina.

Você sabe quanto custa, de verdade, entregar o que vende?',
    data_publicacao = '2026-10-06', hora_publicacao = '08:00', status = 'agendado'
where id = 'f8c71efb-f415-45f9-b0f6-6bb3d20d03e0'
  and escopo = 'franqueadora'
  and media_url like '%1M1VV0qmWirgYUwl7UjKDFr3YW2RDszpc%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'Uma agenda cheia pode ser sinal de procura pelo seu trabalho. Mas ela não significa, por si só, um negócio estruturado.

No consultório, existe um limite claro: as horas do seu dia. Se toda a receita depende exclusivamente do seu atendimento, o crescimento também fica preso a esse tempo.

O próximo passo é pensar em uma estrutura que trabalhe junto com você e amplie o alcance da sua profissão sem exigir que você esteja no consultório 24 horas por dia.

Hoje, o seu negócio depende só da sua agenda?',
    data_publicacao = '2026-10-07', hora_publicacao = '20:00', status = 'agendado'
where id = '88d51f29-2b47-4aef-859b-0b8b224ad25d'
  and escopo = 'franqueadora'
  and media_url like '%1bv4REGd7DiBxor9nk1QhQW41BblFmT8V%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'E se o consultório fosse apenas o começo?

Ir além do consultório não significa deixar de ser terapeuta nem parar de atender. O convite é continuar fazendo bem o que você já faz e desenvolver uma segunda competência: olhar para o seu conhecimento com visão estratégica e empreendedora.

É possível pensar em um negócio construído ao redor da sua experiência profissional, sem abandonar a essência do atendimento.

Que possibilidade você enxerga para além da sua agenda?',
    status = 'revisao'
where id = '3d63baf8-56e2-4fd6-9c12-27d61e9c9de7'
  and escopo = 'franqueadora'
  and media_url like '%18vj7g1TIpu51jWP7nKta0KFvnLlY7gHK%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'Qual é a diferença entre mandar e liderar?

Neste corte, a conversa passa pela forma como uma equipe trabalha: todos colaboram, mas é a liderança que mobiliza as pessoas para agir. Dar ordens é uma coisa. Construir um ambiente em que o trabalho acontece junto é outra.

Essa diferença aparece menos no discurso e mais na prática de cada dia.

Como você exerce a liderança na sua equipe?'
where id = '18009934-e723-4f80-8234-615eb32d3ffb'
  and escopo = 'franqueadora'
  and media_url like '%1ZsTDcS0X0H334cdGrKVCOU7peJGqlXzQ%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'A competência que levou você ao consultório pode não ser a mesma que levará seu negócio além dele.

Ser excelente no atendimento é essencial. Mas, quando toda a renda depende de encaixar mais pacientes nas mesmas horas do dia, o crescimento pode vir acompanhado de exaustão.

Neste corte, a experiência com médicos sobrecarregados mostra por que a habilidade clínica e a visão de negócio precisam caminhar juntas.

Que competência você está desenvolvendo para cuidar também do futuro do seu trabalho?'
where id = 'f046a281-b668-452b-bdf5-3fb9a60b7f9b'
  and escopo = 'franqueadora'
  and media_url like '%1Cj7a0H53okEZcatpUogBbn4dLIR-6KYr%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'Quanto mais indispensável você é para cada detalhe, menos espaço o negócio tem para crescer.

Atender, conferir a agenda, cuidar da clínica e resolver tudo sozinho pode parecer controle. Com o tempo, vira sobrecarga: se você precisa parar, a operação também para.

Delegar bem faz parte da liderança. É assim que outras pessoas assumem responsabilidades e o trabalho deixa de depender de uma única pessoa.

Se você tirar um dia de folga, o seu negócio continua funcionando?'
where id = 'bff0e831-33a6-4797-92bf-9d6849be1a46'
  and escopo = 'franqueadora'
  and media_url like '%13vVq9O9HGL3-LOVtSdyr-fSaflnGqF1M%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'Delegar não é abandonar uma tarefa nas mãos de outra pessoa.

Quando alguém assume uma responsabilidade, precisa entender o que fazer, ter espaço para mostrar dificuldades e receber acompanhamento. Feedback e cobrança fazem parte do desenvolvimento da equipe.

Uma operação bem acompanhada libera o empreendedor para pensar estrategicamente e liderar, sem precisar executar tudo sozinho.

Na sua rotina, você delega com acompanhamento ou só transfere a tarefa?'
where id = '68eff232-c579-4f2d-98c4-ad899d65ec39'
  and escopo = 'franqueadora'
  and media_url like '%1NEnYj43uB_EkXorrbLw95_WtdtalT4IK%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'Se cada pessoa faz de um jeito, a operação vira improvisação.

Delegar sem um processo claro abre espaço para interpretações diferentes: uma pessoa entende uma direção, outra segue outra, e a equipe passa o dia corrigindo falhas que poderiam ter sido evitadas.

Metodologia, planejamento e responsabilidades bem definidas dão à liderança um caminho para orientar o trabalho de todos.

No seu negócio, os processos estão claros ou tudo depende de improviso?'
where id = '538af2ff-4b20-4ee9-a068-f56112f14154'
  and escopo = 'franqueadora'
  and media_url like '%1nYmsdBRxiSiSwxV1gq3QNI0PNvAtrLLf%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'Um negócio que só funciona quando o dono está presente ainda depende demais de uma pessoa.

Marcos conta que, no início da primeira franquia, sentia que não podia se afastar. Quando preparou a equipe e mudou a forma de liderar, conseguiu sair por períodos maiores sem que a operação parasse. Essa experiência também abriu espaço para pensar na expansão.

Construir autonomia na equipe não é perder importância. É criar uma operação capaz de seguir em frente.

O que aconteceria com o seu negócio se você se afastasse por uma semana?'
where id = '9487d178-0858-4601-a366-d068443ae4f3'
  and escopo = 'franqueadora'
  and media_url like '%1hAiMIU5YNCJV8U7_yxtMZMga-Y4kh2Zx%'
  and length(btrim(legenda)) = 0;

update public.franquia_social_posts
set legenda = 'Como você enxerga as oportunidades na saúde mental?

Neste corte, a área é apresentada pela ideia de “oceano azul”: olhar para espaços de atuação que podem ser desenvolvidos, em vez de disputar apenas os caminhos já conhecidos.

A imagem ajuda a fazer uma pergunta estratégica para quem trabalha com saúde mental: que possibilidades existem além do formato de atuação que você já conhece?

Qual oportunidade você percebe nesse mercado?'
where id = '9b8fbfd9-b2a0-4152-b2e0-d4644606d154'
  and escopo = 'franqueadora'
  and media_url like '%1MJ3BnbKXsAfPWI9vcAvfda-mwExSNerf%'
  and length(btrim(legenda)) = 0;

commit;
