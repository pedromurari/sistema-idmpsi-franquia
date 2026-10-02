# Instruções para quem (ou o quê) for trabalhar neste repositório

Este arquivo é lido tanto pelo Codex (CLI/IDE da OpenAI) quanto pelo Claude
Code — é o jeito de os dois agentes terem o mesmo contexto sem precisar
repetir explicação toda vez. Se você é um agente de IA abrindo este projeto,
leia isto antes de mexer em qualquer arquivo.

## O que é este projeto

Portal do Franqueado da **Franquia IDM PSI** — franqueado loga e vê o DRE e as
notas fiscais da própria unidade; o franqueador (ADM geral) vê todas as
unidades. Detalhes de produto/escopo: ver `README.md`.

**Dois funis distintos:** `/comercial` e `franquia_leads` cuidam de alunos de
cada unidade. `/expansao` e `franquia_expansao_*` cuidam da venda de novas
franquias e são exclusivos do ADM. Nunca juntar esses dados nem copiar os IDs
de usuários Auth do CRM interno para este projeto. Ver
`docs/EXPANSAO_FRANQUIAS.md`.

## Não é o mesmo projeto do CRM interno

Existe um outro repositório, **local, nesta mesma máquina**, em
`E:\onze-digital-main` — é o CRM interno da Onze Digital (gestão de leads,
matrícula, financeiro da empresa). São dois produtos, dois repositórios, dois
projetos Supabase e dois projetos Vercel **separados**.

**Mas use aquele repositório como referência o tempo todo.** Muita coisa boa
já foi resolvida lá e não precisa ser reinventada aqui:
- `src/index.css` e `tailwind.config.ts` → paleta de cores oficial da marca
  (já copiada pra cá, mas confira se não ficou desatualizada).
- `src/components/ui/*` → primitivas shadcn/ui usadas (mesmo estilo de botão,
  card, dialog, tabela).
- `src/components/crm/ui/premium.tsx` → padrão visual de tabela/stat tile
  usado nas telas "premium" do CRM — útil se este portal crescer e precisar
  de telas mais ricas que um DRE simples.
- `src/components/crm/TimeComercial.tsx` (`lockedVendor`/`viewAsName`) →
  é o mesmo princípio arquitetural do multi-tenant aqui (franqueado só vê a
  própria unidade, admin vê tudo), só que lá é por vendedor e aqui é por
  `franquia_id`.
- `vite.config.ts` de lá → baseline de headers de segurança (CSP, HSTS,
  X-Frame-Options) que também usamos aqui.

Não copie código de lá sem adaptar — tem bastante coisa específica do CRM
interno (WhatsApp/Evolution API, pipeline de leads, aquecimento) que não tem
nada a ver com este portal.

## Stack

Vite + React + TypeScript + Tailwind + shadcn/ui + Supabase (auth + Postgres
com RLS) + React Router + TanStack Query. Sem framework de SSR — é uma SPA,
igual o CRM interno.

## Segurança — o modelo que este projeto segue

1. **RLS em toda tabela, sem exceção.** Ver `supabase/migrations/0001_init_franquias.sql`.
2. **RLS sozinha não basta.** Postgres também exige `GRANT` de tabela pro
   papel `authenticated` -- sem isso dá "permission denied" mesmo com a
   policy certa. Isso já nos mordeu uma vez (ver `0002_grants.sql`). Toda
   tabela nova precisa dos dois: RLS *e* grant.
3. **Nunca usar a chave `service_role` no front.** Qualquer coisa que
   precise bypassar RLS (ex: emissão real de nota fiscal via integração
   externa) tem que ser uma edge function, nunca uma chamada direto do
   navegador do franqueado.
4. **Toda alteração financeira/fiscal é auditada** (`franquia_audit_log`,
   trigger automático). Não criar `update`/`delete` que vá por fora disso.
5. Funções que verificam papel (`franquia_is_franqueador()`, `franquia_minha_unidade()`)
   são `SECURITY DEFINER` com `search_path` fixo, de propósito -- é o jeito
   recomendado pelo Supabase de evitar recursão de RLS e search_path
   hijacking. Não trocar pra `SECURITY INVOKER` sem entender por quê.

## Infra deste projeto (separada do CRM interno)

- GitHub: `github.com/pedromurari/sistema-idmpsi-franquia`
- Supabase: organização **"IDM PSI Franquia"** (plano Free), projeto
  `sistema-idmpsi-franquia`, região `sa-east-1`. Esta organização **não**
  está conectada ao conector/MCP do Supabase que o Claude usa no CRM interno
  -- o MCP continua separado, mas a CLI autenticada já tem acesso à organização
  (verificado em 02/10/2026). Projeto ref `bremvrsjmnsvtpgcsgtj`; conferir
  esse vínculo antes de usar `supabase db query --linked`. Também é possível
  usar o SQL Editor. Não usar `db push` sem reconciliar o histórico das
  migrations executadas manualmente.
- Vercel: projeto `sistema-idmpsi-franquia` criado, com domínio de produção
  `https://sistema.idmpsifranquia.com`. Conferir o commit/deploy atual antes
  de presumir que alterações locais já estejam publicadas.

## Rodando local

```
npm install
cp .env.example .env   # preencher com a URL + anon key do projeto Supabase acima
npm run dev             # porta 8090 (o CRM interno usa 8080 -- não conflita)
```

## Pendências em aberto

Ver a seção "O que falta pra ir pra produção de verdade" em `README.md` pro
que falta pra v1 ir pra produção, e **`ROADMAP.md`** pros 8 módulos maiores
que o sócio/Rodrigo pediram (funil comercial, jornada do aluno, acadêmico,
professores, operacional, relatórios, integrações). O roadmap documenta pra
cada módulo: o que já existe aqui, o que dá pra reaproveitar do CRM interno,
e a ordem sugerida -- leia antes de começar um módulo novo, pra não
duplicar trabalho entre sessões/agentes diferentes.
