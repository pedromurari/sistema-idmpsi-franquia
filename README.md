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

1. **Criar o projeto Supabase real** (separado do CRM interno) e rodar a
   migration. Depois, gerar os tipos:
   ```
   npx supabase gen types typescript --project-id <id> > src/integrations/supabase/types.ts
   ```
2. **Criar as contas dos primeiros franqueados** (Supabase Auth) + a linha
   correspondente em `franquia_profiles` e `franquia_user_roles` — hoje não
   tem tela de cadastro, é feito direto no banco/pelo franqueador.
3. **Decidir como o DRE chega no sistema**: hoje é só uma tabela
   (`franquia_dre_lancamentos`) que alguém popula manualmente ou por
   importação — ainda não está integrado com nenhum extrato bancário/Asaas.
4. **Emissão real de nota fiscal**: hoje o franqueado só *solicita*
   (status `pendente`). A emissão de verdade (integração com prefeitura/NFS-e
   ou um emissor terceiro) precisa virar uma **edge function** com
   `service_role`, nunca algo que o navegador do franqueado chama direto.
5. **2FA** pros logins de franqueado/franqueador, dado que é acesso a dado
   fiscal de terceiro — o Supabase Auth suporta isso nativamente (MFA).
6. Deploy: repositório próprio no GitHub + projeto próprio na Vercel
   (`vercel.json` já configurado pro rewrite de SPA).

## Rodando local

```
npm install
cp .env.example .env   # preencher com o projeto Supabase real
npm run dev
```
