# Ecossistema digital da franquia — preparação antes da primeira unidade

Estado conferido em 17/10/2026. **Ainda não há franqueados nem unidades reais em operação.** O registro `IDM PSI — Unidade Teste` foi desativado no banco de produção; ele permanece para homologação administrativa e não conta como franquia aberta. O isolamento de duas unidades é exercitado com dados simulados nos testes de Postgres e de interface. A homologação com contas reais fica para quando houver a primeira unidade.

## Produtos e limites

| Frente | Código atual | Função | Situação |
| --- | --- | --- | --- |
| Site institucional atual | `E:\Area-de-Membors` / projeto Vercel `members-onze-digital` | Apresentar a marca e encaminhar visitantes para cursos e contato | `www.idmpsi.com.br` abre `/comecar` nesse projeto. É também o portal de alunos existente. |
| Protótipo de site institucional separado | `E:\idmpsi-site` / projeto Vercel `idmpsi-site` | Possível substituto para a frente pública | Publicado apenas no domínio `idmpsi-site.vercel.app`, sem o domínio institucional principal. O formulário de contato no código local ainda mostra “em breve”, e há alterações locais em andamento. Não assumir que esse protótipo é o site ativo. |
| Página de venda de franquias | `E:\pv-franquia` / projeto Vercel `pv-franquia-idmpsi` | Explicar a oportunidade e captar interessados | Landing page própria em `www.idmpsifranquia.com` e `www.idmpsifranquia.com.br`; formulário usa a Edge Function `captura-franquia` do Supabase da franquia e alimenta `/expansao`. O menu do site institucional atual aponta para a versão `.com.br`. |
| Portal de gestão da franquia | Este repositório | Franqueadora e operação de cada unidade | Publicado em `sistema.idmpsifranquia.com`; expansão, comercial, financeiro e social mídia separados por papel e `franquia_id`. |
| Área de membros atual | `E:\Area-de-Membors` | Aulas e acesso dos alunos existentes | Produto Next.js e Supabase próprios, que também atende `www.idmpsi.com.br`. Tem cursos e matrículas, mas não é uma área multiunidade da franquia. Reaproveitar padrões de aula/progresso, sem compartilhar IDs Auth ou conectar seu banco diretamente ao portal da franquia. |

O site institucional e a página de franquias têm públicos diferentes. Os dois devem levar interessados em **comprar franquia** ao mesmo funil `/expansao`; interessados em **cursos** seguem para o funil de aluno apropriado. Não misturar os cadastros. Antes de mexer no domínio institucional, decidir se a experiência pública continua em `members-onze-digital` ou migra para o protótipo `idmpsi-site`; a mudança de domínio não faz parte deste passo.

## Área de membros da rede

A estrutura proposta tem um **catálogo oficial da franqueadora** e um **espaço de cada unidade**, sempre identificado por `franquia_id`. O ADM publica materiais oficiais e escolhe onde aparecem; a unidade vê os materiais atribuídos e administra apenas conteúdo/participantes locais permitidos. Toda tabela futura precisa de RLS, GRANT e teste de acesso cruzado, além do 2FA já exigido no portal de gestão.

Há uma decisão de produto que precede a criação das contas e telas: essa área servirá inicialmente **somente à equipe do franqueado** (treinamentos, playbooks, marca) ou **também aos alunos** para assistir cursos? Se incluir alunos, eles precisam de papel, matrícula e experiência de aprendizagem próprios; não devem receber acesso ao DRE nem ao portal administrativo. O código existente em `Area-de-Membors` pode orientar o player e o progresso, mas seu login e banco não devem ser confundidos com os da franquia.

## Sequência para lançar campanhas sem unidades piloto

1. **Fechar o percurso público**: o site institucional atual já aponta para a landing `.com.br`, e os domínios `.com`/`.com.br` estão associados ao projeto `pv-franquia-idmpsi` na Vercel. Falta testar clique, consentimento, captura, deduplicação e chegada do lead em `/expansao` com uma submissão controlada antes de ligar campanhas. O CTA “em breve” pertence somente ao protótipo `idmpsi-site`, não ao site público atual.
2. **Preparar a operação central**: responsáveis, rotina de atendimento, campanhas/origens e social mídia da franqueadora. Leads de expansão devem continuar separados dos leads de alunos das unidades.
3. **Construir o kit de abertura**: catálogo de produtos/cursos oficiais, materiais da franqueadora e processo de criação de unidade e de convite ao primeiro responsável. Dados de cobrança e royalties dependem de regras comerciais definidas, sem percentuais presumidos.
4. **Abrir a área de membros conforme o público escolhido**: catálogo central e acesso por unidade; se houver alunos, matrícula e progresso em trilha separada do acesso de gestão.
5. **Homologar o primeiro franqueado real** quando existir: login/2FA, permissões, conteúdo, comercial, financeiro e negação de acesso a outra unidade. Até lá, manter testes automatizados com duas unidades fictícias sem apresentá-las como operação real.

Não publicar promessas de integração de pagamento, emissão fiscal ou postagem automática enquanto essas rotas não existirem. “Programado” no social mídia ainda significa calendário interno.
