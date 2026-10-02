# Revisão do alicerce — 02/10/2026

Esta revisão é uma checagem técnica do código e do projeto Supabase vinculado
`bremvrsjmnsvtpgcsgtj`, não uma auditoria independente nem um teste de
invasão. Não há deploy Vercel para validar cabeçalhos em produção.

## Verificado

- As 11 tabelas públicas do projeto remoto têm RLS ativo. `anon` não tem
  `SELECT` e `authenticated` não tem `TRUNCATE` em nenhuma delas.
- Financeiro e notas têm auditoria automática. A meta comercial também é
  auditada; mudanças de etapa do lead têm histórico separado.
- `franquia_id` separa os dados por unidade no banco. Ligações a turmas usam
  chave estrangeira composta com a unidade. Testes exercitam acesso cruzado,
  usuário inativo, permissões e auditoria.
- A migração 0006 impede que uma conta de franqueado declare uma nota como
  emitida, forje número/PDF ou atribua a solicitação a outro usuário. Foi
  aplicada ao projeto remoto em 02/10/2026.
- O navegador usa apenas a chave pública do Supabase. `.env` é ignorado pelo
  Git. `vercel.json` agora especifica CSP e demais cabeçalhos de proteção;
  precisam ser conferidos quando houver deploy.

## Antes de produção com franqueados reais

1. **MFA obrigatório e aplicado no banco**: ativar fluxo de segundo fator e
   exigir sessão `aal2` para dados financeiros/fiscais. A interface sozinha
   não protege a API. Planejar recuperação de conta e suporte.
2. **Homologação real**: criar contas de duas unidades, testar login e todas
   as leituras/escritas autorizadas e negadas via API real. Testes atuais de
   interface simulam a API; testes SQL usam Postgres em memória.
3. **Migrations reprodutíveis**: reconciliar o histórico remoto das migrations
   aplicadas manualmente antes de usar `supabase db push`; criar verificação em
   CI para schema, RLS, grants e testes.
4. **Escala dos relatórios**: `Dashboard.tsx` lê lançamentos e notas no
   navegador sem paginação. Acima do limite de resposta do PostgREST, totais
   podem ficar incompletos. Substituir por agregações no banco com escopo RLS
   e paginar listagens grandes antes de crescer a base.
5. **Operação**: estabelecer backup/restauração testados, monitoramento,
   alertas, rotação de segredos e política de retenção para dados pessoais.
   O projeto está no plano Free e não há evidência de restauração testada.
6. **Dependências**: `npm audit --omit=dev` apontou dois avisos moderados em
   `react-router`/`react-router-dom`. A aplicação é SPA, sem hidratação SSR, e
   os destinos de navegação atuais são estáticos. Revisar a migração para a
   versão corrigida antes de adicionar rotas ou redirecionamentos dinâmicos.

Também falta definir a política de cancelamento/retificação de notas e
lançamentos já fechados. A trilha atual registra exclusões, mas não substitui
uma regra de negócio para preservar documentos fiscais emitidos.
