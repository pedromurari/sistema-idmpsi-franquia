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

**O que já existe neste projeto:** DRE e solicitação de notas fiscais.
Etapa 1 implementada no código: `franquia_turmas`, cadastro/edição de lançamentos,
filtro de DRE e caixa realizado por turma, baixa integral e configuração mensal
de royalties estimados (base por caixa ou competência, percentual explícito).
**Banco:** estrutura 0003 verificada e correção de grants 0004 aplicada no Supabase
da franquia em 02/10/2026; tipos gerados do projeto real. Falta homologação do fluxo
com contas reais. Ver `docs/ETAPA_1_FINANCEIRO.md`.
**Ainda falta:** pagamentos parciais, fechamento/cobrança/repasse de royalties,
dashboard de inadimplência, comissionamento e integrações externas.

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

**Adicionado 02/10/2026 (pedido do Pedro):** notas fiscais precisam de uma
opção de **conectar via API/webhook com a plataforma de assinatura** que
gera a nota (ex: Asaas/Iugu emitindo NF-e automático) -- hoje
`franquia_notas_fiscais` só guarda status manual (pendente/emitida), não
recebe nada de fora. Isso é extensão do módulo 3 (Financeiro) tanto quanto
deste módulo 8: schema de notas fiscais provavelmente precisa de campo pra
origem/payload do webhook, e a emissão automática confirma o que já está
documentado em `docs/ETAPA_1_FINANCEIRO.md` -- tem que ser edge function
com `service_role`, nunca chamada direto do navegador do franqueado.

## 9. Catálogo de Produtos e Cursos ⚪ (não estava na lista original -- pedido à parte do Pedro, 02/10/2026)

Cadastro de produtos/cursos da franqueadora **antes** de vender: ficha de
pagamento pronta, link de matrícula por unidade (cada unidade com o próprio
link, vinculado à **conta bancária/gateway daquela unidade**, não
centralizado), material padrão/playbook anexado ao produto. Objetivo: toda
unidade nova já nasce com os produtos oficiais prontos pra vender, sem
montar do zero.

**Referência no CRM interno:** `Produtos.tsx` e o fluxo de matrícula
(`matricula-pagamento-criar` e as edge functions de pagamento) resolvem
parte disso pro CRM interno, mas lá é tudo numa conta só (Onze
Digital/IDM) -- aqui precisa funcionar por unidade, cada franqueado com o
próprio recebimento. Não existe nada disso neste projeto ainda.

**Depende de:** módulo 1 (funil comercial) pra fazer sentido de verdade --
é o catálogo que alimenta o link de matrícula que o funil usa. Também tem
sobreposição com o módulo 8 (gateway de pagamento por unidade).

**Complexidade:** alta (multiplica a complexidade de pagamento por unidade,
não é só "ter uma lista de produtos").

---

## Parcerias comerciais (ação do Pedro, não é código)

**Adicionado 02/10/2026.** O Pedro quer avaliar contato com a **Stone**
pra virar o meio de pagamento oficial da franquia, e também conectar com o
**"IDM online"** (plataforma já existente -- confirmar com o Pedro qual é
exatamente antes de qualquer integração técnica). Isso é decisão de
negócio/parceria, não uma tarefa de código: nenhum agente deve tentar
contatar a Stone ou qualquer fornecedor por conta própria. Só vira tarefa
técnica depois que o Pedro fechar a parceria e definir qual gateway cada
unidade vai usar -- aí sim entra no módulo 8/9 acima (cada unidade com o
próprio gateway vinculado).

---

## Ordem sugerida (meu palpite, Pedro decide)

Dependências reais: os módulos 4, 5 e 7 precisam de **turmas** dentro da unidade.
A estrutura da migration 0003 já foi verificada no banco remoto. Sugestão de sequência:

1. **Módulo 3 (parte 2):** `franquia_turmas` + fluxo de caixa por turma +
   royalties -- código e banco preparados; homologar conforme o guia da etapa 1.
2. **Módulo 1:** funil comercial -- é o que mais parece com um produto "novo"
   que o franqueado sente que ganhou.
3. **Módulo 2:** ficha do aluno + turmas/vagas (a parte de frequência/evasão
   pode esperar uma rodada 2).
4. **Módulo 6:** operacional -- rápido, reaproveita bastante do CRM interno.
5. **Módulos 4, 5, 7, 8** -- nessa ordem ou conforme a prioridade do negócio
   mudar; 7 e partes de 8 (WhatsApp) ficam mais baratas depois que 1 e 2
   existirem.

## Passagem de trabalho — etapa 1

O Codex implementou a etapa financeira inicial, com testes de regras monetárias,
RLS/GRANT/auditoria no Postgres local e interface com dados simulados. A migration
0003 também corrige os snapshots da auditoria (`TG_OP` é maiúsculo) e bloqueia
usuários inativos nas funções de acesso. Em 02/10/2026, o Codex encontrou a 0003 já aplicada no banco remoto, validou sua
estrutura, aplicou a 0004 para remover grants administrativos excessivos e gerou
os tipos reais. Não recriar essas estruturas: estender a partir delas.
Regras de royalties reais devem ser configuradas pela administração; nenhum
percentual foi presumido. Depois da ativação, o próximo módulo sugerido continua
sendo o **1: Comercial e Captação**.
