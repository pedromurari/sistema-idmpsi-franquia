# Social mídia da franquia

O ZIP `social-media-manager.zip` foi usado como referência para grade,
calendário, Kanban e edição de posts. O projeto de origem é um Lovable
separado, com Auth, Supabase e dados de demonstração próprios; esses serviços
e dados não foram importados. O módulo novo usa o login e banco deste portal.

Rotas:

- `/social-franqueadora`: apenas papel `franqueador`, para conteúdo da marca e
  da franqueadora.
- `/social-unidade`: cada franqueado vê e edita somente a própria unidade;
  o ADM pode escolher uma unidade para acompanhar ou editar.

A migration `0009_social_midia.sql` cria `franquia_social_posts` com RLS e
GRANT. A coluna `escopo` separa conteúdo da franqueadora de conteúdo de
unidade. Os links de mídia ficam na linha do post; o módulo não copia vídeos
para o Supabase Storage. Os arquivos do Drive continuam com as permissões
definidas no Drive, que precisam permitir acesso a quem vai abrir cada link.

No Social Mídia Central, o seletor **Cortes / Copies para anúncios** alterna
entre dois quadros independentes. Cortes continua em `franquia_social_posts`,
com grade, calendário e Kanban. Copies usa `franquia_social_copies`, criada
pela migration `0014_social_copies.sql`, com briefing, texto do anúncio,
chamada para ação, referência, prazo e etapas Pendente → Em criação → Em
revisão → Aprovada → Em uso. Pode-se cadastrar uma pendência sem texto pronto;
aprovar exige texto. Apenas franqueadores podem ler e editar essas copies,
conforme RLS e GRANT. As alterações são auditadas, e não há exclusão pelo
portal. O quadro de copies não aparece no Social Mídia da unidade.

Os scripts idempotentes `scripts/planejar_10_cortes_outubro.sql` e
`scripts/planejar_2_cortes_pendentes.sql` foram aplicados manualmente no
projeto `bremvrsjmnsvtpgcsgtj` em 02/10/2026. Os links dos vídeos foram
vinculados diretamente no banco, sem colocá-los no repositório.
Os 10 primeiros vídeos estão vinculados em ordem aos dias de segunda,
quarta e sexta, de 05 a 26/10/2026. Os cortes 11 e 12 aguardam arquivo nos
dias 28 e 30/10. Nenhuma legenda foi inventada. Os 10 vídeos estão em
revisão, não marcados como publicados.

O status “Programado” é apenas uma data no calendário editorial. Publicação
automática em Instagram, Facebook ou outra rede exigirá conexão específica
das contas, autorização e tratamento de falhas da plataforma. Até lá, o
processo de postagem é manual.

A migration `0013_social_horario.sql` acrescenta a hora planejada no fuso de
Brasília. Em 06/10/2026, o Corte 01 foi reposicionado para o mesmo dia às 08h
e o Corte 02 ficou em 07/10 às 20h. As legendas dos dez vídeos disponíveis
foram preparadas a partir de transcrição local e salvas com o script
`scripts/legendas_cortes_outubro.sql`. Os Cortes 01 e 02 estão como
“Programado” no calendário editorial; os demais continuam “Em revisão”,
aguardando definição de horário e validação editorial. Os Cortes 11 e 12
continuam sem vídeo, portanto sem legenda. “Programado” não publica o post
automaticamente em nenhuma rede social.
