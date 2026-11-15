# -*- coding: utf-8 -*-
"""
Gera os templates de e-mail do Supabase Auth a partir de um molde unico.

Por que gerador e nao 6 arquivos soltos: o "miolo" muda, mas cabecalho, botao,
rodape e paleta sao os mesmos nos 6. Mantendo num lugar so, mudar a cor da
marca ou o texto do rodape e uma edicao, nao seis -- e nenhum e-mail fica pra
tras parecendo de outra empresa.

Rodar:  python supabase/templates/gerar.py
Depois: colar cada .html em Supabase > Authentication > Emails > Templates.
"""
import pathlib

LOGO = "https://sistema.idmpsifranquia.com/email-logo.png"
AQUI = pathlib.Path(__file__).parent

# Paleta identica a tela de login do portal (neutral-900 + #f8b400). De
# proposito: quem clica no botao cai numa tela com as mesmas cores, entao o
# e-mail nao parece phishing de outro lugar.
ESCURO = "#171717"
DOURADO = "#f8b400"
TEXTO = "#27272a"
SUAVE = "#52525b"
BORDA = "#e4e4e7"
FONTE = "Arial,Helvetica,sans-serif"

MOLDE = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light only">
<title>__TITULO__</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;-webkit-font-smoothing:antialiased;">
<div style="display:none;font-size:1px;color:#f4f4f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">__PREVIA__</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f5;">
<tr><td align="center" style="padding:32px 16px;">

<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid __BORDA__;border-radius:10px;">
  <tr><td align="center" style="background-color:__ESCURO__;padding:28px 24px;border-radius:9px 9px 0 0;">
    <img src="__LOGO__" width="200" alt="IDM PSI &mdash; Desperta sua mente" style="display:block;width:200px;max-width:70%;height:auto;border:0;outline:none;text-decoration:none;">
    <div style="margin:14px 0 0;font-family:__FONTE__;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#a1a1aa;">Portal do Franqueado</div>
  </td></tr>

  <tr><td style="padding:34px 34px 0;">
    <h1 style="margin:0 0 18px;font-family:__FONTE__;font-size:21px;line-height:1.3;font-weight:bold;color:__ESCURO__;">__TITULO__</h1>
    __CORPO__
  </td></tr>

  <tr><td style="padding:26px 34px 0;">__ACAO__</td></tr>

  <tr><td style="padding:30px 34px 34px;">
    <div style="height:1px;background-color:__BORDA__;font-size:0;line-height:0;">&nbsp;</div>
    <p style="margin:18px 0 0;font-family:__FONTE__;font-size:12px;line-height:1.6;color:#71717a;">
      Mensagem autom&aacute;tica de acesso e seguran&ccedil;a da sua conta no portal.<br>
      D&uacute;vidas? Responda este e-mail ou fale com <a href="mailto:contato@idmpsifranquia.com" style="color:#71717a;">contato@idmpsifranquia.com</a>.
    </p>
  </td></tr>
</table>

<p style="margin:20px 0 0;font-family:__FONTE__;font-size:11px;line-height:1.6;color:#a1a1aa;">
  IDM PSI Franquia &middot; sistema.idmpsifranquia.com<br>
  Nunca pedimos sua senha por e-mail, telefone ou WhatsApp.
</p>

</td></tr>
</table>
</body>
</html>
"""


def paragrafo(txt, topo=0):
    return ('<p style="margin:%dpx 0 14px;font-family:%s;font-size:15px;line-height:1.65;color:%s;">%s</p>'
            % (topo, FONTE, TEXTO, txt))


def aviso(txt):
    """Caixa lateral dourada -- usada pro recado de seguranca."""
    return ('<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 0;">'
            '<tr><td style="background-color:#fafafa;border-left:3px solid %s;padding:14px 16px;border-radius:0 6px 6px 0;">'
            '<p style="margin:0;font-family:%s;font-size:13px;line-height:1.6;color:%s;">%s</p>'
            '</td></tr></table>' % (DOURADO, FONTE, SUAVE, txt))


def botao(rotulo, url):
    """Botao + link de texto por extenso. O fallback existe porque cliente de
    e-mail corporativo as vezes engole o <a> estilizado e sobra so o texto."""
    return (
        '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">'
        '<tr><td align="center" bgcolor="%s" style="border-radius:6px;">'
        '<a href="%s" style="display:inline-block;padding:15px 34px;font-family:%s;font-size:16px;font-weight:bold;'
        'color:%s;text-decoration:none;border-radius:6px;">%s</a>'
        '</td></tr></table>'
        '<p style="margin:22px 0 0;font-family:%s;font-size:12px;line-height:1.6;color:#71717a;text-align:center;">'
        'Se o bot&atilde;o n&atilde;o funcionar, copie e cole este endere&ccedil;o no navegador:<br>'
        '<span style="color:#52525b;word-break:break-all;">%s</span></p>'
        % (DOURADO, url, FONTE, ESCURO, rotulo, FONTE, url)
    )


def codigo(valor):
    return ('<table role="presentation" width="100%%" cellpadding="0" cellspacing="0" border="0">'
            '<tr><td align="center" style="background-color:#fafafa;border:1px dashed %s;border-radius:8px;padding:20px;">'
            '<div style="font-family:Consolas,Menlo,monospace;font-size:30px;letter-spacing:0.28em;font-weight:bold;color:%s;">%s</div>'
            '</td></tr></table>' % (BORDA, ESCURO, valor))


# URLs apontam direto pra tela do portal com token_hash, sem passar pelo
# /auth/v1/verify. Um salto a menos = menos chance de link quebrado, e e o
# formato que src/pages/RedefinirSenha.tsx espera ler.
URL_SENHA = "{{ .SiteURL }}/redefinir-senha?token_hash={{ .TokenHash }}&type=recovery"
URL_CONVITE = "{{ .SiteURL }}/redefinir-senha?token_hash={{ .TokenHash }}&type=invite"

TEMPLATES = {
    "convite": dict(
        arquivo="01-convite.html",
        assunto="Seu acesso ao Portal do Franqueado IDM PSI",
        titulo="Seu acesso est&aacute; pronto",
        previa="Crie sua senha e entre no Portal do Franqueado.",
        corpo=paragrafo("Voc&ecirc; foi cadastrado no <strong>Portal do Franqueado IDM PSI</strong>, onde ficam os n&uacute;meros da sua unidade, o comercial, o financeiro e o acad&ecirc;mico.")
              + paragrafo("Para come&ccedil;ar, crie sua senha no bot&atilde;o abaixo. Logo depois o portal vai pedir a configura&ccedil;&atilde;o do aplicativo autenticador (verifica&ccedil;&atilde;o em duas etapas) &mdash; &eacute; r&aacute;pido e obrigat&oacute;rio, porque o sistema guarda dado financeiro e fiscal.")
              + aviso("Este convite vale por tempo limitado e s&oacute; pode ser usado uma vez. Se vencer, pe&ccedil;a um novo em &ldquo;Esqueci minha senha&rdquo; na tela de entrada."),
        acao=botao("Criar minha senha", URL_CONVITE)),

    "recovery": dict(
        arquivo="02-redefinir-senha.html",
        assunto="Redefinir sua senha do Portal IDM PSI",
        titulo="Vamos definir uma nova senha",
        previa="Link para criar uma nova senha de acesso ao portal.",
        corpo=paragrafo("Recebemos um pedido para redefinir a senha da conta <strong>{{ .Email }}</strong> no Portal do Franqueado.")
              + paragrafo("Clique no bot&atilde;o abaixo para escolher uma senha nova. Depois de salvar, voc&ecirc; entra com ela normalmente.")
              + aviso("O link s&oacute; funciona uma vez e vence depois de pouco tempo. <strong>Se n&atilde;o foi voc&ecirc; que pediu, pode ignorar este e-mail</strong> &mdash; sua senha atual continua valendo e nada muda."),
        acao=botao("Definir nova senha", URL_SENHA)),

    "confirmacao": dict(
        arquivo="03-confirmar-cadastro.html",
        assunto="Confirme seu e-mail - Portal IDM PSI",
        titulo="Confirme seu e-mail",
        previa="Um clique para confirmar seu endere&ccedil;o e liberar o acesso.",
        corpo=paragrafo("Falta s&oacute; confirmar que <strong>{{ .Email }}</strong> &eacute; mesmo o seu endere&ccedil;o para liberar o acesso ao portal."),
        acao=botao("Confirmar meu e-mail", "{{ .ConfirmationURL }}")),

    "magico": dict(
        arquivo="04-link-magico.html",
        assunto="Seu link de entrada no Portal IDM PSI",
        titulo="Entrar no portal",
        previa="Link de entrada direta, sem digitar senha.",
        corpo=paragrafo("Use o bot&atilde;o abaixo para entrar no Portal do Franqueado sem digitar senha.")
              + aviso("Se n&atilde;o foi voc&ecirc; que pediu, ignore este e-mail. Sem o clique, ningu&eacute;m entra na sua conta."),
        acao=botao("Entrar no portal", "{{ .ConfirmationURL }}")),

    "troca_email": dict(
        arquivo="05-trocar-email.html",
        assunto="Confirme seu novo e-mail - Portal IDM PSI",
        titulo="Confirme a troca de e-mail",
        previa="Confirme o novo endere&ccedil;o da sua conta.",
        corpo=paragrafo("Pediram para trocar o e-mail da sua conta de <strong>{{ .Email }}</strong> para <strong>{{ .NewEmail }}</strong>.")
              + paragrafo("Se foi voc&ecirc;, confirme no bot&atilde;o abaixo.")
              + aviso("<strong>N&atilde;o foi voc&ecirc;?</strong> N&atilde;o clique e avise a gente em contato@idmpsifranquia.com. Enquanto n&atilde;o houver confirma&ccedil;&atilde;o, o e-mail da conta continua o mesmo."),
        acao=botao("Confirmar novo e-mail", "{{ .ConfirmationURL }}")),

    "reautenticacao": dict(
        arquivo="06-reautenticacao.html",
        assunto="Seu codigo de confirmacao - Portal IDM PSI",
        titulo="Seu c&oacute;digo de confirma&ccedil;&atilde;o",
        previa="C&oacute;digo de uso &uacute;nico para confirmar a a&ccedil;&atilde;o no portal.",
        corpo=paragrafo("Digite o c&oacute;digo abaixo no portal para confirmar a a&ccedil;&atilde;o que voc&ecirc; iniciou."),
        acao=codigo("{{ .Token }}")
             + '<p style="margin:18px 0 0;font-family:%s;font-size:13px;line-height:1.6;color:%s;text-align:center;">'
               'N&atilde;o compartilhe este c&oacute;digo com ningu&eacute;m, nem com algu&eacute;m dizendo ser do suporte.</p>' % (FONTE, SUAVE)),
}


def montar(t):
    html = MOLDE
    trocas = (("__TITULO__", t["titulo"]), ("__PREVIA__", t["previa"]),
              ("__CORPO__", t["corpo"]), ("__ACAO__", t["acao"]),
              ("__LOGO__", LOGO), ("__ESCURO__", ESCURO),
              ("__BORDA__", BORDA), ("__FONTE__", FONTE))
    for chave, valor in trocas:
        html = html.replace(chave, valor)
    return html


if __name__ == "__main__":
    for nome, t in TEMPLATES.items():
        destino = AQUI / t["arquivo"]
        destino.write_text(montar(t), encoding="utf-8")
        print("%-16s -> %-26s  assunto: %s" % (nome, t["arquivo"], t["assunto"]))
