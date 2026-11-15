# -*- coding: utf-8 -*-
"""
Sobe os 6 templates de e-mail pro Supabase pela API de gerenciamento.

Por que script e nao colar no painel: sao 6 abas, cada uma com assunto + HTML,
salvando uma por uma. Na mao da erro e, pior, ninguem lembra de refazer quando
o template muda. Aqui e um comando.

Por que PATCH e nao `supabase config push`: o config push manda o bloco [auth]
inteiro montado a partir do config.toml -- o que apagaria o SMTP do Resend, a
Site URL e os limites que ja estao configurados no projeto. Este script toca
SOMENTE os campos de template, nada mais.

Uso:
    export SUPABASE_ACCESS_TOKEN=sbp_...      (ou deixa o `supabase login` salvar)
    python scripts/subir_templates_email.py [--conferir]

--conferir apenas le a config atual e compara, sem gravar nada.
"""
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

PROJETO = "bremvrsjmnsvtpgcsgtj"
API = "https://api.supabase.com/v1/projects/%s/config/auth" % PROJETO
RAIZ = pathlib.Path(__file__).resolve().parent.parent

sys.path.insert(0, str(RAIZ / "supabase" / "templates"))
import gerar  # noqa: E402  -- fonte unica dos assuntos e do HTML

# Nome interno de cada template no Supabase. A chave da esquerda e a mesma
# usada em gerar.TEMPLATES.
CAMPOS = {
    "convite": "invite",
    "recovery": "recovery",
    "confirmacao": "confirmation",
    "magico": "magic_link",
    "troca_email": "email_change",
    "reautenticacao": "reauthentication",
}


def token():
    t = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if t:
        return t
    # O `supabase login` guarda aqui quando nao ha chaveiro do sistema.
    arq = pathlib.Path.home() / ".supabase" / "access-token"
    if arq.exists():
        return arq.read_text(encoding="utf-8").strip()
    sys.exit("Sem token. Rode `npx supabase login` ou defina SUPABASE_ACCESS_TOKEN.")


def chamar(metodo, corpo=None):
    dados = json.dumps(corpo).encode("utf-8") if corpo is not None else None
    req = urllib.request.Request(API, data=dados, method=metodo)
    req.add_header("Authorization", "Bearer %s" % token())
    req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        sys.exit("%s %s -> %s\n%s" % (metodo, API, e.code, e.read().decode("utf-8", "replace")))


def montar_payload():
    payload = {}
    for chave, nome in CAMPOS.items():
        t = gerar.TEMPLATES[chave]
        html = (RAIZ / "supabase" / "templates" / t["arquivo"]).read_text(encoding="utf-8")
        payload["mailer_subjects_%s" % nome] = t["assunto"]
        payload["mailer_templates_%s_content" % nome] = html
    return payload


def main():
    conferir = "--conferir" in sys.argv
    novo = montar_payload()

    atual = chamar("GET")
    # Checagem de seguranca: se o SMTP nao estiver configurado, o envio ainda
    # cairia no servidor de demonstracao (2 e-mails/hora) e o template bonito
    # nao resolveria nada -- melhor avisar do que o e-mail sumir no limite.
    if not atual.get("smtp_host"):
        print("AVISO: SMTP customizado nao esta configurado neste projeto.")

    print("SMTP host:   %s" % (atual.get("smtp_host") or "(nenhum)"))
    print("Remetente:   %s" % (atual.get("smtp_admin_email") or "(nenhum)"))
    print("Site URL:    %s" % (atual.get("site_url") or "(nenhuma)"))
    print("")

    mudancas = [c for c, v in novo.items() if atual.get(c) != v]
    if not mudancas:
        print("Nada a fazer: os 6 templates ja estao identicos no Supabase.")
        return
    print("Campos que vao mudar (%d):" % len(mudancas))
    for c in sorted(mudancas):
        print("  - %s" % c)

    if conferir:
        print("\n--conferir: nada foi gravado.")
        return

    chamar("PATCH", novo)
    depois = chamar("GET")
    faltou = [c for c, v in novo.items() if depois.get(c) != v]
    if faltou:
        sys.exit("Gravou, mas estes campos nao bateram na releitura: %s" % faltou)
    print("\nOK: os 6 templates subiram e foram conferidos na releitura.")
    print("SMTP continua: %s / %s" % (depois.get("smtp_host"), depois.get("smtp_admin_email")))


if __name__ == "__main__":
    main()
