# Portal do Franqueado — IDM PSI

Sistema da **franqueadora** da Franquia IDM PSI: cada franqueado loga e vê o
DRE e as notas fiscais da própria unidade; o franqueador (ADM geral) vê tudo.

**Não é o mesmo projeto/banco do CRM interno** (`sistema-onze-digital`). É um
sistema separado de propósito, porque aqui entra dado fiscal/financeiro de
terceiros (franqueados), não só dado interno da Onze Digital.

## O que já está pronto (v1 — escopo "só financeiro")

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

## O que falta pra ir pra produção de verdade

1. **Conferir o schema do projeto Supabase da franquia** (já criado, separado
   do CRM interno) e aplicar as migrations pendentes. A etapa de turmas e
   financeiro requer `0003_turmas_financeiro.sql`, após `0001` e `0002`.
   Depois, gerar os tipos reais (os atuais são tipos locais baseados nas migrations):
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
6. Deploy: o repositório próprio no GitHub já existe; falta projeto próprio na Vercel
   (`vercel.json` já configurado pro rewrite de SPA).

## Rodando local

```
npm install
cp .env.example .env   # preencher com o projeto Supabase real
npm run dev
```

## Turmas e financeiro por turma — etapa 1 do roadmap

Implementação local disponível; a migration 0003 ainda precisa ser aplicada no
Supabase da franquia. Instruções, regras e limites em
[`docs/ETAPA_1_FINANCEIRO.md`](docs/ETAPA_1_FINANCEIRO.md).

- `/turmas`: cadastro/edição/inativação pelo franqueador, consulta da própria unidade pelo franqueado.
- `/dre` (menu **Financeiro**): lançamentos por competência, filtro por turma,
  caixa realizado pela data da baixa integral e royalties estimados por unidade/mês.
- RLS + GRANT, vínculo obrigatório à mesma unidade e auditoria automática.
- Novas tabelas não fazem parte do CRM interno e não usam seu projeto Supabase.

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
