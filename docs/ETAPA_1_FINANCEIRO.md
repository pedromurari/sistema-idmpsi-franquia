# Etapa 1 — turmas, caixa realizado e royalties

## Ativação no Supabase da franquia

1. Confirmar que o projeto é **sistema-idmpsi-franquia**, organização **IDM PSI Franquia**.
2. Conferir que as migrations 0001 e 0002 já foram executadas. Não reaplicar 0001 em um schema existente.
3. Executar **todo** o arquivo `supabase/migrations/0003_turmas_financeiro.sql` no SQL Editor.
   Ele usa transação; se falhar, corrigir a causa antes de tentar novamente. Não é uma migration para reaplicar após sucesso.
4. Gerar os tipos do projeto com `supabase gen types typescript` e substituir os tipos locais de `src/integrations/supabase/types.ts`.
5. Rodar `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.
6. Validar com um franqueador e dois franqueados de unidades distintas antes de publicar.

Esta entrega não aplicou SQL no banco remoto nem publicou na Vercel.

## Como usar

O franqueador escolhe uma unidade no cabeçalho e acessa **Turmas**. Pode criar,
editar ou inativar turmas. Nome é único dentro da unidade, sem diferenciar
maiúsculas/minúsculas e espaços nas extremidades. Capacidade é opcional; não
representa vagas livres sem matrículas. Franqueados apenas consultam.

Em **Financeiro**, selecionar mês e turma (ou todas / sem turma). O franqueador
pode criar e editar lançamentos. Um lançamento pertence a uma unidade e,
opcionalmente, a uma turma dessa mesma unidade. Categorias e descrições são
livres. Escrita financeira continua exclusiva do franqueador, protegida no banco.

- **DRE:** soma receitas/despesas da competência escolhida.
- **Caixa realizado:** soma lançamentos com data de baixa no mês escolhido,
  independentemente da competência. Valor integral, sem parcelas parciais.
- **Sem baixa:** significa ausência de confirmação; não implica inadimplência.
- **Sem turma:** despesas gerais e registros antigos; não há rateio automático.
- **Movimentação líquida:** entradas menos saídas do período; não é saldo bancário,
  pois não há saldo inicial nem conciliação nesta etapa.

Para um lançamento antigo de setembro recebido em outubro, manter competência
setembro e informar a data de recebimento em outubro. Ele aparecerá no DRE de
setembro e no caixa de outubro. Para desfazer uma baixa incorreta, editar e
limpar a data. Toda alteração é auditada. Não há botão de exclusão financeira.

## Royalties

Cada unidade/mês exige base e percentual explícitos. Não existe valor padrão,
herança automática ou cobrança criada ao salvar a regra. Base disponível:

- Receita por competência: soma das receitas do DRE naquele mês.
- Receita recebida: soma das receitas com baixa integral naquele mês.

A estimativa é `receita bruta registrada × percentual / 100`, arredondada uma
vez, no total, para centavos. Despesas, taxas e deduções contratuais não são
abatidas. Percentual 0% representa isenção explícita; ausência de regra mostra
**Sem regra**, nunca um zero que pareça calculado. A estimativa considera toda
a unidade mesmo quando a tabela está filtrada por turma.

Regras de meses diferentes são independentes. Alterações de regra ou dos
lançamentos recalculam a estimativa e ficam auditadas, mas não há fechamento
imutável, reconhecimento de despesa, repasse, boleto ou pagamento automático.
Só configurar para operação após confirmar as condições contratuais aplicáveis.

## Segurança e integridade

- Novas tabelas possuem RLS e GRANT explícitos; franqueados leem apenas a própria unidade.
- FK composta bloqueia turma de outra unidade mesmo em escrita administrativa.
- Contas inativas deixam de acessar dados protegidos pelos helpers, mesmo com JWT válido.
- Migrations anteriores são preservadas; registros antigos ganham turma/baixa nulas.
- A auditoria registra ator, evento e conteúdo anterior/novo. Foi corrigida a
  comparação de `TG_OP` da função original. Essa correção vale para eventos futuros;
  não é possível recuperar snapshots que já foram gravados como NULL.
- Formulários de edição verificam `updated_at`; edição concorrente exige recarregar,
  em vez de sobrescrever silenciosamente o trabalho de outro administrador.
- Consultas de totais percorrem todas as páginas do PostgREST; a tabela exibe 25 por página.
- Chaves do cache incluem usuário/papel/unidade; a troca de unidade remonta filtros/formulários.

## Verificação e limites

`npm test` executa cálculos e migrations reais em Postgres local em memória
(PGlite), simulando os papéis e `auth.uid()` do Supabase. Cobre isolamento,
grants, escrita proibida, auditoria, preservação de registros, FK entre unidades,
percentuais, usuários inativos e concorrência. Não substitui uma validação no
Supabase remoto com Auth real e a configuração específica daquele projeto.

`npm run test:ui` abre Edge no Windows (Chromium em outros sistemas) e intercepta
HTTP com fixtures fictícias. Cobre criação de turma/lançamento/regra, competência
vs. caixa, visão somente leitura no celular, troca de unidade e estado de erro.
Usa porta 8091 e variáveis de teste em processo separado; não altera `.env`.

Ficam para próximas entregas: pagamentos parciais, parcelas/vencimentos,
inadimplência, importação, conciliação, saldo inicial, fechamento financeiro,
repasse de royalties e integrações externas. O próximo módulo no roadmap é o funil comercial.
