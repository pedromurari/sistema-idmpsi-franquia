# Frente do franqueado — operação de cada unidade

Diagnóstico do código e do cofre `Cerebro Franquia IDM PSI` em 26/10/2026. Esta é a trilha de trabalho deste chat. O produto atende a **unidade franqueada**; venda de novas franquias (`/expansao`) e social central pertencem à franqueadora e não entram no funil de alunos.

## Estado verificável

| Área da unidade | O que o código oferece hoje | Lacuna para operação real |
| --- | --- | --- |
| Acesso | Login Supabase, dois papéis (`franqueador`, `franqueado`), TOTP obrigatório e RLS por `franquia_id`; franqueado vê só o menu da unidade | Não há convite/cadastro de equipe, papéis de vendedor, secretaria ou professor. O primeiro acesso ainda exige cadastro manual no Auth/banco. |
| Comercial de alunos | `/comercial`: leads, etapas, canais/campanhas, histórico de contato, próxima ação, metas por turma e data/hora de entrada | `matricula` e `aluno` são apenas nomes de etapa: não geram venda, matrícula, aluno, contrato ou cobrança. Não há vendedor individual, atribuição nem metas/comissões pessoais. |
| Turmas | `/turmas`: curso, período, capacidade e status por unidade; tabela com RLS | Somente o ADM central cria/edita. Não há alunos inscritos, vagas ocupadas, lista de espera nem agenda acadêmica. |
| Financeiro | `/dre`: competência, caixa por baixa integral, turma, royalties estimados; `/notas`: pedido e status manual | Somente o ADM central lança/edita DRE. Não há recebíveis por aluno, pagamento parcial, inadimplência, conciliação ou emissão fiscal integrada. |
| Social local | `/social-unidade`: grade, calendário e Kanban isolados por unidade | Planejamento editorial manual; não publica nas redes nem distribui automaticamente conteúdo central para unidades. |
| Aluno e ensino | Nenhuma rota ou tabela de aluno/matrícula/presença/avaliação | Ficha do aluno, jornada, professores, currículo, frequência, certificados e área de membros multiunidade ainda não existem. |
| Equipe e operação | Nenhuma rota operacional da unidade | Tarefas, permissões por função, playbooks, agenda e rotina da secretaria ainda não existem. |
| Indicadores | `/dashboard` resume DRE e notas da unidade | Não mede conversão real, ocupação, recebíveis, evasão ou resultado por vendedor; resumos financeiros ainda carregam linhas no navegador. |

O portal de membros existente em `E:\Area-de-Membors` é outro produto e outro Supabase. Pode orientar a experiência de cursos, sem reutilizar seus IDs Auth nem presumir isolamento entre unidades. O WhatsApp conectado no projeto é **da expansão da franqueadora** (migration `0016_whatsapp_expansao.sql`); não é um canal de mensagens dos leads de alunos.

## Fluxo mínimo que precisa fechar

`lead da unidade → responsável e atividades → proposta/curso → venda → matrícula → aluno em turma → cobrança/baixa → frequência → conclusão`. Hoje o código percorre apenas a primeira parte e permite trocar a etiqueta do lead para “Matrícula” ou “Aluno”. Essas transições não devem ser usadas como substituto dos respectivos registros.

## Sequência de construção nesta frente

1. **Fundação da unidade e da equipe.** Definir quem pode criar turmas, atender leads, ver o financeiro e administrar usuários. Criar convite/ativação de contas por unidade, papéis efetivos e matriz de permissões. Testar em duas unidades fictícias, inclusive negação de acesso cruzado. A franqueadora continua com supervisão global.
2. **Comercial operável.** Atribuição de leads a vendedores, carteira individual, tarefas e próximos contatos, metas por vendedor e indicadores de conversão. Usar `docs/COMERCIAL_PARIDADE.md` como especificação; não importar usuários nem IDs do CRM interno.
3. **Núcleo aluno + matrícula.** Catálogo oficial de cursos definido pela franqueadora e disponibilizado às unidades; venda e matrícula transacionais por unidade; ficha de aluno e vínculo com turma/capacidade. Impedir duplicidade e referências a turma/curso de outra unidade. Separar claramente proposta, venda confirmada e matrícula ativa.
4. **Financeiro da operação.** Recebíveis por matrícula, pagamentos parciais, atrasos, baixa e conciliação; ligar ao DRE e à regra de royalties somente depois de definir as regras comerciais. Acesso de gestão financeira da unidade deve ser explícito e auditado. Escolha e credenciais do gateway por unidade ficam para a integração, sem presumir fornecedor ou percentual.
5. **Execução pedagógica e rotina.** Currículo oficial da rede, professores/alocação, agenda, presença, avaliações e alertas de evasão; tarefas da secretaria e playbooks locais. Certificado depende de critérios acadêmicos e financeiros definidos.
6. **Área de membros e indicadores.** Material oficial com acesso por unidade; se alunos participarem, criar identidade/experiência de aluno separada do portal administrativo. Painel do dono com conversão, ocupação, inadimplência e evasão calculadas no banco; social local pode receber conteúdo central conforme regras de distribuição.

## Primeiro incremento recomendado

Começar por **papéis da equipe + atribuição de lead** (etapas 1 e 2), com um caminho de convite ao usuário real e escopo de unidade no banco. Isso torna o comercial utilizável por uma equipe sem dar ao vendedor acesso ao DRE e prepara a matrícula. Em paralelo, especificar o contrato de dados `venda → matrícula → aluno`, para que a próxima entrega feche o funil sem transformar a etapa do Kanban em registro financeiro.

Critério de aceite do primeiro incremento: ADM cria uma unidade fictícia e convida um gestor/vendedor; o gestor vê apenas sua unidade; vendedor vê sua carteira e leads não atribuídos conforme regra aprovada, registra contato e não acessa financeiro; outro usuário/unidade não vê nem altera esses dados. Testes SQL precisam cobrir RLS, `GRANT`, escopo cruzado e sessão `aal2`; teste de interface cobre login, convite e atribuição. Não usar `service_role` no navegador.

## Decisões de produto ainda abertas

- O franqueado poderá criar/editar turmas e lançamentos financeiros, ou essas operações ficam com uma função específica de gestor/financeiro da unidade? A permissão atual é só do ADM central.
- Quem terá acesso à área de membros na primeira versão: somente equipe da unidade ou também alunos? Aluno nunca deve entrar no painel administrativo.
- Qual é o catálogo inicial, quando uma venda vira matrícula ativa e quais são as regras reais de cobrança, comissão e royalties? Não inferir porcentagens nem fornecedor de pagamento.

Não há unidade franqueada real registrada na última verificação documentada (17/10/2026). Homologar com duas unidades simuladas agora e repetir os fluxos com a primeira unidade real antes da abertura.
