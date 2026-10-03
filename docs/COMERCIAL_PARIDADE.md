# Comercial da franquia — paridade com o Time Comercial do CRM interno

**Origem do pedido (Pedro, 02/10/2026):** o `/comercial` entregue na etapa 2 está
"cru". O Time Comercial do CRM interno é muito mais completo — canais, dados,
metas visuais, vendas de cada vendedor expostas — e o da franquia precisa ficar
no mesmo nível.

**Referência (somente leitura):** `E:\onze-digital-main\src\components\crm\TimeComercial.tsx`
(3.562 linhas). Aqui: `src/pages/Comercial.tsx` (211 linhas) + migration `0005`.
Não copiar código: adaptar o conceito a multi-tenant (`franquia_id`), RLS+GRANT+auditoria
(ver `AGENTS.md`) e tabelas `franquia_*`.

## Onde estamos x onde precisa chegar

| O que o interno tem | Franquia hoje | O que construir |
|---|---|---|
| **Canais de aquisição** (SDD, Direto, Webinário, Workshop, Retorno/Base, Orgânico) com contagem por canal e filtro | Só `origem` em texto livre | Canal estruturado + filtro com contagens; migrar `origem` sem perder o texto |
| **Campanhas por canal** (nome, condições/oferta, tipo novo/retorno) | Não existe | `franquia_campanhas` por unidade; lead aponta para a campanha |
| **Vendedor como dimensão** ("Ver como", cada um vê o próprio funil, "pegar lead") | Não existe — só `criado_por` | Papel de vendedor por unidade + `vendedor_id` no lead |
| **Vendas por vendedor** (`MinhasVendasSection`: aluno, produto, forma, status, contrato, data da venda x pagamento previsto) | "Matrícula" é só uma etapa; não gera venda | Tabela de vendas + visão "Minhas vendas" e ranking |
| **Metas** pessoal / equipe / por turma, com progresso visual | Só meta por turma, em barra simples | Meta por vendedor e da unidade, com escalonamento mensal |
| **Remuneração / comissão** por vendedor e fechamento | Não existe | Regra configurável por unidade + fechamento (ver módulo 3) |
| **Aba Dados** (leads por mês, vendas por mês/dia da semana, ciclo de vendas, atividade do vendedor, movimentação do dia, métricas por turma) | 3 indicadores | Gráficos (recharts, já usado no interno) alimentados por RPCs agregadas |
| **Cards ricos** (WhatsApp 1 clique, registrar ligação, trajetória, nota do vendedor, follow-up com prazo/tentativas, alerta de vencido, busca) | Cards simples + etapa/próxima ação | Ver fase F |
| **Operação** (links de matrícula, alunos aguardando turma) | Não existe | Depende dos módulos 2 e 9 — só registrar a dependência |
| **Chat do WhatsApp por vendedor** | Não existe | Depende do módulo 8 |

## Fases propostas (nesta ordem)

**A — Canais e campanhas.** Tabelas `franquia_canais` (padrão da franqueadora +
canais próprios da unidade) e `franquia_campanhas`; `franquia_leads.canal` e
`campanha_id`. Filtro por canal com contagem e cards de visão geral (total de leads,
em matrícula e %, aguardando follow-up). *Decisão aberta:* lista oficial de canais
da franquia (sugestão inicial: Direto, Indicação de aluno, Indicação de terapeuta,
Instagram, Google, Webinário/Workshop, Orgânico, Retorno/Base).

**B — Vendedor.** Ampliar `franquia_user_roles` para `vendedor` (hoje só
`franqueador`/`franqueado`), com `franquia_id` obrigatório. `franquia_leads.vendedor_id`,
"pegar lead"/"devolver", "Ver como" de vendedor dentro da unidade. RLS: vendedor vê
leads próprios + não atribuídos da unidade; franqueado/franqueador veem todos.
Exige testes de acesso cruzado e GRANT explícito. *Recomendação:* login real por
vendedor, como a Helen no CRM interno — não só um nome em texto.

**C — Vendas.** `franquia_vendas`: lead, vendedor, turma, valor bruto e **líquido de
taxa do gateway**, forma de pagamento, `data_venda` (pagamento previsto) separada de
`data_registro` (dia em que a venda foi feita), status. Lição do interno: faturamento
e comissão se calculam sobre o líquido, e a data prevista da pré-matrícula é futura.
Registrar matrícula passa a criar a venda (hoje não cria nada). Integra com o
lançamento financeiro do módulo 3 e, mais tarde, com produto (módulo 9) e aluno (módulo 2).

**D — Metas e comissão.** Meta mensal por vendedor e da unidade (escalonamento como
o `METAS_MESES` do interno), progresso visual, comissão por regra **configurada pela
administração — nenhum percentual presumido** — e fechamento mensal.

**E — Dados e gráficos.** Leads por canal e por mês, funil com conversão por etapa,
vendas por mês/dia da semana, ciclo médio de venda, atividade e comparativo por
vendedor. **Agregar no banco** (RPC com escopo RLS), nunca baixar linhas pro navegador
— é a mesma pendência do `Dashboard.tsx` em `docs/SEGURANCA_BASE.md` (item 4).

**F — Cards e rotina do vendedor.** WhatsApp (`wa.me`), registrar ligação (atendeu ou
não), trajetória (já existe `franquia_lead_etapas`), nota do vendedor separada das
observações de origem, follow-up manual com prazo e contador de tentativas, alerta de
vencido, busca por nome/telefone, exclusão controlada e auditada.

Ordem sugerida: **A → F (parcial) → B → C → D → E.** E pode começar logo após A,
com os dados que já existem.

## Cuidados

- Todo objeto novo: RLS + GRANT + auditoria + teste PGlite com acesso cruzado entre
  unidades e entre vendedores.
- Nada de `service_role` no navegador; RPCs de agregação com `security invoker`.
- O interno tem etapas específicas do canal SDD (Frio, Pré-aquecimento, Grupo de
  Oferta). São do produto de lançamento do IDM — **não levar** para a franquia sem
  decisão do Pedro. Começar com o funil único atual e canal como filtro.
- Matrícula só vira aluno/cobrança quando os módulos 2 e 3 estiverem prontos; até lá,
  continuar avisando isso na tela.

## Critério de pronto da paridade

Franqueado/vendedor consegue: filtrar por canal e campanha, ver só o próprio funil,
registrar contato, fechar matrícula gerando uma venda, ver suas vendas e metas
com progresso, e o franqueador compara vendedores e canais em gráficos — tudo com
isolamento por unidade comprovado nos testes.
