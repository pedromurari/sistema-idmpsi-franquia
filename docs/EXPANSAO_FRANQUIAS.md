# Expansão de franquias — transferência do CRM interno

Esta área vende **novas unidades da franquia**. É diferente de `/comercial`,
que acompanha interessados em cursos dentro de uma unidade. No portal novo,
`/expansao` é exclusiva do papel `franqueador` (ADM) na rota, no menu e nas
políticas RLS. O banco separado usa as tabelas `franquia_expansao_leads`,
`franquia_expansao_responsaveis` e `franquia_expansao_campanhas` da migration
0007, aplicada em 02/10/2026. Franqueados não têm leitura ou escrita nelas.

O Kanban mantém as fases Novo, Contatado, Reunião Agendada, Fechado e Perdido,
busca, filtro/atribuição de responsável, contato por WhatsApp/telefone,
formulário de lead e histórico de métricas de campanha. Exclusão foi trocada
por arquivamento auditado para preservar rastreabilidade.

No CRM interno, o menu e a rota `franquia_psi` foram removidos. Os 5 leads
históricos foram copiados e conferidos em 02/10/2026 pelo script idempotente
`scripts/importar_leads_expansao.ps1`; os 5 registros de origem continuam
preservados. Nenhuma campanha existia lá. Leitura, edição e inserção nas duas
tabelas legadas foram revogadas para usuários do CRM após a landing page parar
de apontar para o banco antigo. IDs de usuários do Auth
do CRM interno não devem ser copiados para o Auth deste projeto. Os nomes de
responsáveis são cadastrados separadamente no novo banco.

## Página pública de interesse

A landing page principal está em `https://www.idmpsifranquia.com/`, no
repositório separado `E:\pv-franquia` (projeto Vercel `pv-franquia-idmpsi`).
Em 02/10/2026, seu HTML público ainda enviava `POST` com chave `anon` ao
`franquia_leads` do CRM antigo e exibia sucesso inclusive após falha HTTP ou
de rede. A policy da tabela antiga não autoriza INSERT anônimo. O código fonte
da landing foi corrigido para enviar à Edge Function do banco novo, exigir
consentimento e Turnstile, e só confirmar após resposta HTTP de sucesso.
Ele foi publicado em 02/10/2026 em modo seguro: sem as chaves Turnstile,
o formulário fica indisponível e o visitante encontra o link de WhatsApp.
O Kanban ADM também foi publicado em `sistema.idmpsifranquia.com`.

O código da nova página `/quero-ser-franqueado` e da Edge Function
`captura-franquia` está preparado. A função exige validação **no servidor**
do Cloudflare Turnstile antes de gravar um lead com `service_role`. A tabela
não dá permissão de escrita pública. A captura fica indisponível até configurar:

- no Vite/Vercel: `VITE_TURNSTILE_SITE_KEY` (chave pública);
- nos segredos da Edge Function: `CAPTURA_TURNSTILE_SECRET`,
  `CAPTURA_ALLOWED_ORIGINS` e `CAPTURA_ALLOWED_HOSTNAMES`;
- no Turnstile: domínios públicos da landing page e do portal.

`SUPABASE_SERVICE_ROLE_KEY` é fornecida pelo runtime da Edge Function e
**nunca** entra em variáveis `VITE_` ou no site estático. Na landing page,
`TURNSTILE_SITE_KEY` é uma variável Vercel lida pela rota pública
`/api/captura-config`; a chave secreta fica apenas na Edge Function. O CRM
antigo também possui
`lista_espera_cidades` (2 registros em 02/10/2026), documentada como lista de
espera pública de cidades/turmas. Não confundir esses interessados com leads de
compra de franquia sem confirmar a finalidade da página externa.
