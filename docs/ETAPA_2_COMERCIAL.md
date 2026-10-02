# Etapa 2 — Comercial e captação

O funil inicial está disponível em `/comercial`. A migração
`supabase/migrations/0005_funil_comercial.sql` foi aplicada ao projeto Supabase
**sistema-idmpsi-franquia** em 02/10/2026. A aplicação usa a chave pública e
as políticas RLS; não usa `service_role` no navegador.

## O que funciona

- Franqueado cadastra e edita apenas leads da própria unidade; o franqueador
  escolhe uma unidade no seletor **Ver como**.
- Etapas: lead, atendimento, entrevista/experiência, matrícula, aluno,
  formado, pós-graduação e perdido. Cada entrada em etapa fica registrada com
  ator, data e turma da época. O motivo é obrigatório ao marcar como perdido.
- Nome e e-mail ou telefone são obrigatórios. E-mail e telefone não podem se
  repetir dentro da mesma unidade. Um lead só pode ser vinculado a turma da
  própria unidade.
- Origem, score manual, próxima ação, bolsa e desconto propostos; bolsa e
  desconto juntos não podem passar de 100%.
- Meta mensal de matrículas por turma, definida pelo franqueador. O realizado
  conta leads distintos que entraram na etapa matrícula naquele mês com turma.
  A meta fica na trilha de auditoria administrativa.

## Limites desta entrega

A etapa comercial **matrícula** não cria cadastro acadêmico de aluno, contrato,
cobrança ou receita no DRE. Próxima ação é um lembrete visual, sem envio
automático. Score e propostas de bolsa/desconto são manuais. Automações,
integrações de campanhas e ficha do aluno seguem no `ROADMAP.md`.

Para verificar localmente: `npm test`, `npm run test:ui`, `npm run typecheck`,
`npm run lint` e `npm run build`. Os testes de interface simulam a API; a
homologação final com login real de franqueado depende de uma conta de teste
vinculada à unidade no Supabase Auth.
