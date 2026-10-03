# Portal do Franqueado — IDM PSI

Sistema da **franqueadora** da Franquia IDM PSI: cada franqueado loga e vê o
DRE e as notas fiscais da própria unidade; o franqueador (ADM geral) vê tudo.

**Não é o mesmo projeto/banco do CRM interno** (`sistema-onze-digital`). É um
sistema separado de propósito, porque aqui entra dado fiscal/financeiro de
terceiros (franqueados), não só dado interno da Onze Digital.

## O que já está pronto

- Login com Supabase Auth, 2 papéis: `franqueador` e `franqueado`.
- **DRE por unidade** (`/dre`) — franqueado vê a própria, franqueador escolhe
  qual unidade ver em `/unidades`.
- **Notas fiscais** (`/notas`) — franqueado solicita, acompanha status
  (pendente/emitida/cancelada); franqueador processa.
- **Isolamento multi-tenant via RLS** (`supabase/migrations/0001_init_franquias.sql`)
  — cada franqueado só enxerga a própria `franquia_id`, garantido no banco,
  não no front. Franqueador usa uma função `SECURITY DEFINER` (`franquia_is_franqueador()`)
  pra enxergar tudo, sem bypassar RLS com a chave `service_role` no navegador.
- **Trilha de auditoria** (`franquia_audit_log`) — toda alteração em DRE e
  notas fiscais fica registrada (quem, quando, antes/depois), só o
  franqueador lê.
- **Comercial** (`/comercial`) — leads por unidade, etapas do funil, próxima
  ação manual, propostas de bolsa/desconto, histórico de etapa e meta mensal
  de matrículas por turma. A etapa "matrícula" não cria aluno ou cobrança.
- **Expansão de franquias** (`/expansao`) — Kanban e campanhas de venda de
  novas unidades, exclusivo da administração. É separado do funil de alunos.
- **Social mídia**: `/social-franqueadora` para o ADM e `/social-unidade` para
  cada unidade. Calendário, grade, Kanban e edição de conteúdos compartilham
  o login do portal; a RLS separa o planejamento geral do de cada franqueado.
  “Programado” representa calendário interno, sem publicação automática nas redes.
  Os 10 primeiros cortes da franqueadora foram vinculados aos vídeos do Drive
  e planejados para segunda, quarta e sexta a partir de 05/10/2026; aguardam
  revisão e legendas. Mais dois espaços completam a quarta semana.
  Detalhes em [`docs/SOCIAL_MIDIA.md`](docs/SOCIAL_MIDIA.md).
- **Áreas de trabalho separadas**: o ADM começa em `/rede`, com visão consolidada,
  unidades, venda de franquias e conteúdo central. Ao escolher uma unidade,
  abre o painel e os módulos operacionais dela; o nome da unidade aparece no
  menu e no indicador de área atual. O franqueado entra direto na própria
  unidade e não recebe os menus da franqueadora. A seleção da unidade é apenas
  contexto de navegação: o isolamento dos dados continua garantido pela RLS.

## O que falta pra ir pra produção de verdade

1. **Conferir o schema do projeto Supabase da franquia** (já criado, separado
   do CRM interno) e aplicar as migrations pendentes. A etapa de turmas e
   financeiro requer `0003_turmas_financeiro.sql`, após `0001` e `0002`.
   As migrations 0003 e 0004 foram verificadas no banco em 02/10/2026;
   a 0005 (funil comercial) e a 0006 (proteção da solicitação de notas) foram
   aplicadas no mesmo dia. Os tipos atuais foram
   gerados desse projeto. Para atualizar:
   ```
   npx supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts
   ```
2. **Criar as contas dos primeiros franqueados** (Supabase Auth) + a linha
   correspondente em `franquia_profiles` e `franquia_user_roles` — hoje não
   tem tela de cadastro, é feito direto no banco/pelo franqueador.
3. **Automatizar a alimentação financeira**: o franqueador já pode cadastrar
   e editar lançamentos pela tela Financeiro após aplicar a migration 0003.
   Importação, extrato bancário e Asaas ainda não estão integrados.
4. **Emissão real de nota fiscal**: hoje o franqueado só *solicita*
   (status `pendente`). A emissão de verdade (integração com prefeitura/NFS-e
   ou um emissor terceiro) precisa virar uma **edge function** com
   `service_role`, nunca algo que o navegador do franqueado chama direto.
5. **2FA** pros logins de franqueado/franqueador, dado que é acesso a dado
   fiscal de terceiro — o Supabase Auth suporta isso nativamente (MFA).
6. Deploy: o projeto próprio na Vercel já existe em
   `https://sistema.idmpsifranquia.com`. As telas de expansão e comercial foram
   publicadas em 02/10/2026; a captura pública usa uma Edge Function no
   Supabase, com validação e limite de envios por IP e contato.

Revisão do alicerce e prioridades antes de produção:
[`docs/SEGURANCA_BASE.md`](docs/SEGURANCA_BASE.md).
Transferência da seção de franquias do CRM interno:
[`docs/EXPANSAO_FRANQUIAS.md`](docs/EXPANSAO_FRANQUIAS.md).

## Rodando local

```
npm install
cp .env.example .env   # preencher com o projeto Supabase real
npm run dev
```

## Turmas e financeiro por turma — etapa 1 do roadmap

Implementação local disponível, com estrutura 0003 verificada e correção de grants
0004 aplicada no Supabase da franquia em 02/10/2026. Instruções, regras e limites em
[`docs/ETAPA_1_FINANCEIRO.md`](docs/ETAPA_1_FINANCEIRO.md).

- `/turmas`: cadastro/edição/inativação pelo franqueador, consulta da própria unidade pelo franqueado.
- `/dre` (menu **Financeiro**): lançamentos por competência, filtro por turma,
  caixa realizado pela data da baixa integral e royalties estimados por unidade/mês.
- RLS + GRANT, vínculo obrigatório à mesma unidade e auditoria automática.
- Novas tabelas não fazem parte do CRM interno e não usam seu projeto Supabase.

## Comercial e captação — etapa 2 do roadmap

Funil por unidade, histórico de etapas e meta mensal por turma em `/comercial`.
Regras e limites em [`docs/ETAPA_2_COMERCIAL.md`](docs/ETAPA_2_COMERCIAL.md).

Verificações (Node 22.18+ ou 24):

```
npm run typecheck
npm run lint
npm test
npm run build
npm run test:ui
```

Os testes SQL usam Postgres em memória (PGlite); os testes de interface usam
HTTP simulado, sem acessar o Supabase real. No Windows, a interface usa o Edge
instalado. Em outros sistemas, execute `npx playwright install chromium` primeiro.
