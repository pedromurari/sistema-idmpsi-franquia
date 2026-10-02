# Roadmap — Visão 360° da Franquia

Lista que o Pedro recebeu do sócio/Rodrigo (franqueado pra franqueado), 8
módulos pra uma visão completa de franquia. Este arquivo existe pra qualquer
agente (Claude ou Codex) que pegar este projeto saber **onde estamos** e
**o que falta**, sem precisar reler a conversa inteira.

**Antes de implementar qualquer módulo, leia `AGENTS.md`** (convenções de
segurança, RLS+GRANT, o que reaproveitar do CRM interno).

Convenção de status: 🟢 pronto · 🟡 parcial/em andamento · ⚪ não iniciado.

---

## 1. Comercial e Captação — Funil do Aluno ⚪

Funil Lead → Atendimento → Entrevista/Aula Experimental → Matrícula → Aluno →
Formado → Pós-graduação, com origem do lead, score, automação de follow-up,
gestão de bolsas/descontos, meta vs realizado por turma.

**Referência no CRM interno:** `TimeComercial.tsx` (funil + campanhas +
canal de aquisição) e `Pipeline.tsx` já resolvem um funil parecido lá --
é o melhor ponto de partida, adaptado pra multi-tenant (cada franqueado só
vendo o próprio funil). **Não existe hoje neste projeto.**

**Complexidade:** alta (é o módulo mais parecido com todo o Time Comercial
do CRM interno, só que multi-tenant).

## 2. Gestão do Aluno — Jornada Acadêmica 360° 🟡 (zero acadêmico, financeiro parcial)

Ficha 360° (pessoal + financeiro + acadêmico + atendimento), gestão de
turmas/vagas/lista de espera, frequência com alerta de evasão, contratos
digitais, régua de relacionamento automática.

**Referência no CRM interno:** `Pessoas.tsx` + `FichaPessoa` (pasta `pessoa/`)
cobrem a ficha 360° genérica. **Frequência, evasão e régua de relacionamento
não existem em lugar nenhum ainda** -- é construção nova.

**Complexidade:** alta. Sugiro separar em 2 entregas: (a) ficha do aluno +
turmas/vagas primeiro, (b) frequência/evasão/régua depois.

## 3. Financeiro 🟡 (base lançada)

Recorrência/renegociação, fluxo de caixa por turma, dashboard de
inadimplência, **repasse e royalties pra franqueadora**, comissionamento de
closer/SDR. Integração com Asaas / Galax Pay / Conta Azul, extrato em TXT.

**O que já existe neste projeto:** `franquia_dre_lancamentos` (DRE) e
`franquia_notas_fiscais`. **Falta:** campo/cálculo de royalties sobre
receita, fluxo de caixa POR TURMA (hoje o DRE é só por unidade, não por
turma -- precisa de uma tabela `franquia_turmas` primeiro, que também serve
pro módulo 2 e 4), dashboard de inadimplência, comissionamento, as 3
integrações externas.

**Referência no CRM interno:** `Financeiro.tsx`, pasta `finance/`
(`Socios.tsx`, `BalancoConfigForm.tsx`), `ComissoesFechamento.tsx` -- a
lógica de comissão e de fator societário já existe lá, só adaptar.

**Complexidade:** média-alta (é o módulo com mais base pronta pra crescer).

## 4. Gestão Acadêmica e Pedagógica ⚪

Grade curricular por módulo/carga horária/pré-requisito, portal do professor
(lança presença/material/avaliação), controle de horas clínicas e
supervisão, certificação automática (100% + financeiro em dia).

**Não existe em lugar nenhum** (nem no CRM interno). Construção nova do
zero, depende de `franquia_turmas` (ver módulo 3) existir primeiro.

**Complexidade:** alta.

## 5. Gestão de Professores e Supervisores ⚪

Banco de talentos, agenda/alocação sem conflito de sala, pagamento por hora
dada (RPA/NF), comunicação interna (mural).

**Não existe em lugar nenhum.** Depende de `franquia_turmas`/agenda (módulo
4) pra fazer sentido.

**Complexidade:** média-alta.

## 6. Gestão de Equipe e Operacional ⚪

Tasks/Kanban da secretaria, controle de ponto/metas, base de conhecimento
(playbooks, scripts).

**Referência no CRM interno:** `Operacoes.tsx` (tarefas + calendário) é bem
próximo do que esse módulo pede -- provavelmente o mais rápido de adaptar
dos que ainda não existem aqui.

**Complexidade:** média.

## 7. Relatórios — Visão 360° do Dono ⚪

CAC/LTV, taxa de evasão por turma/motivo, ocupação de turmas, ranking de
professor por NPS, previsão de faturamento.

**Depende dos módulos 1, 2, 4 e 5 existirem** -- é consumidor de dado dos
outros, não dá pra fazer "antes" deles de verdade (os números não existiriam
ainda). O Dashboard atual (`src/pages/Dashboard.tsx`) já é o esqueleto onde
isso cresce.

**Complexidade:** média (a parte difícil é os módulos de origem do dado,
não o relatório em si).

## 8. Integrações ⚪

WhatsApp API oficial com histórico por lead; financeiro (Asaas/Iugu/Galax
Pay); Gmail/Outlook; Zoom/Meet/Hotmart/Eduzz; Meta Ads/Google Ads.

**Referência no CRM interno:** WhatsApp via Evolution API já é um problema
resolvido lá (`AquecimentoChips.tsx`, `DisparosMonitor.tsx`, `evo-resposta`
edge function) -- adaptar o mesmo padrão aqui é bem mais barato que
reinventar. As demais integrações não existem em nenhum dos dois projetos.

**Complexidade:** alta no total, mas cada integração é independente -- dá
pra fazer uma de cada vez sem travar o resto.

---

## Ordem sugerida (meu palpite, Pedro decide)

Dependências reais: os módulos 4, 5 e 7 precisam que **turmas** exista como
conceito primeiro (hoje este projeto só tem unidade, não tem turma dentro da
unidade). Sugestão de sequência:

1. **Módulo 3 (parte 2):** `franquia_turmas` + fluxo de caixa por turma +
   royalties -- extensão direta do que já existe, maior ROI imediato.
2. **Módulo 1:** funil comercial -- é o que mais parece com um produto "novo"
   que o franqueado sente que ganhou.
3. **Módulo 2:** ficha do aluno + turmas/vagas (a parte de frequência/evasão
   pode esperar uma rodada 2).
4. **Módulo 6:** operacional -- rápido, reaproveita bastante do CRM interno.
5. **Módulos 4, 5, 7, 8** -- nessa ordem ou conforme a prioridade do negócio
   mudar; 7 e partes de 8 (WhatsApp) ficam mais baratas depois que 1 e 2
   existirem.
