# Modelos de e-mail do portal

Os 6 e-mails que o Supabase Auth dispara, com a identidade do IDM PSI Franquia.

**Não edite os `.html` na mão.** Eles são gerados por `gerar.py` a partir de um
molde único — se mexer só num arquivo, os outros cinco ficam diferentes. Para
mudar qualquer coisa (cor, logo, rodapé, texto), edite `gerar.py` e rode:

```
python supabase/templates/gerar.py
```

## Onde colar

Supabase → Authentication → Emails → **Templates**. Cada aba recebe um arquivo:

| Aba no Supabase | Arquivo | Assunto sugerido |
|---|---|---|
| Invite user | `01-convite.html` | Seu acesso ao Portal do Franqueado IDM PSI |
| Reset Password | `02-redefinir-senha.html` | Redefinir sua senha do Portal IDM PSI |
| Confirm signup | `03-confirmar-cadastro.html` | Confirme seu e-mail — Portal IDM PSI |
| Magic Link | `04-link-magico.html` | Seu link de entrada no Portal IDM PSI |
| Change Email Address | `05-trocar-email.html` | Confirme seu novo e-mail — Portal IDM PSI |
| Reauthentication | `06-reautenticacao.html` | Seu código de confirmação — Portal IDM PSI |

## Decisões que não são óbvias

**Logo em PNG, não WebP.** O portal usa `logo.webp`, mas o Outlook do Windows
renderiza e-mail com o motor do Word, que não lê WebP — o logo viraria um
quadrado quebrado. Por isso existe `public/email-logo.png`, gerado a partir do
mesmo arquivo em 400px (2× dos 200px de exibição, pra não serrilhar em tela
retina).

**Convite e redefinição apontam direto pro portal**, no formato
`{{ .SiteURL }}/redefinir-senha?token_hash={{ .TokenHash }}&type=...`, em vez de
usar `{{ .ConfirmationURL }}`. O `ConfirmationURL` passa pelo `/auth/v1/verify`
do Supabase, que redireciona de novo — um salto a mais, mais chance de link
quebrado no meio do caminho. Este formato é o que `src/pages/RedefinirSenha.tsx`
lê direto.

**Sem link de descadastro.** Estes são e-mails transacionais de conta e
segurança, não marketing: ninguém pode "cancelar a inscrição" do e-mail que
devolve o acesso dele. Link de descadastro entra nos e-mails de campanha
(Broadcasts do Resend), onde é obrigatório por lei — aqui atrapalharia.

**Sem rastreio de clique.** Ligado no Resend, ele reescreve todos os links do
e-mail. Em e-mail de senha isso é perigoso: antivírus corporativo abre links
reescritos pra checar segurança e **queima o token de uso único** antes da
pessoa clicar. Manter desligado em Resend → Domains → Configuration.

**Paleta igual à tela de login** (`#171717` + `#f8b400`). Quem clica no botão
cai numa tela com as mesmas cores, então o e-mail não parece golpe de terceiro.
