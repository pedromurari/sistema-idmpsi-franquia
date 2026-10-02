import { useEffect, useRef, useState, type FormEvent } from "react";
import { Building2, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

declare global {
  interface Window {
    turnstile?: { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void }) => string; reset: (id?: string) => void };
  }
}

const sitekey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;

export default function CapturaFranquia() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string>();
  const [token, setToken] = useState("");
  const [nome, setNome] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [cidade, setCidade] = useState("");
  const [estado, setEstado] = useState("");
  const [consentimento, setConsentimento] = useState(false);
  const [empresa, setEmpresa] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (!sitekey || !container.current) return;
    const render = () => {
      if (!container.current || !window.turnstile || widget.current) return;
      widget.current = window.turnstile.render(container.current, { sitekey,
        callback: (valor) => setToken(valor), "expired-callback": () => setToken("") });
    };
    if (window.turnstile) { render(); return; }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true; script.onload = render;
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (enviando || !sitekey || !url) return;
    setErro(""); setEnviando(true);
    try {
      const resposta = await fetch(`${url}/functions/v1/captura-franquia`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, whatsapp, email, cidade, estado, consentimento, empresa, token }),
      });
      const corpo = await resposta.json() as { mensagem?: string };
      if (!resposta.ok) throw new Error(corpo.mensagem || "Não foi possível enviar.");
      setEnviado(true);
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível enviar.");
      setToken(""); window.turnstile?.reset(widget.current);
    } finally { setEnviando(false); }
  }

  return <main className="min-h-screen bg-gradient-to-b from-primary/10 via-background to-background px-4 py-10">
    <div className="max-w-4xl mx-auto space-y-8"><header className="flex items-center gap-3"><img src="/logo.webp" alt="IDM PSI" className="h-12 w-auto" />
      <span className="font-bold text-lg">Franquia IDM PSI</span></header>
      <div className="grid gap-8 lg:grid-cols-2 items-start"><div className="space-y-5 pt-5"><div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary"><Building2 className="h-4 w-4" /> Expansão de franquias</div>
        <h1 className="text-3xl sm:text-4xl font-bold leading-tight">Quer conhecer a oportunidade de ter uma unidade IDM PSI?</h1>
        <p className="text-muted-foreground">Deixe seus dados para nossa equipe de expansão entrar em contato e explicar o modelo de franquia.</p>
        <p className="text-sm text-muted-foreground">O envio do formulário não representa proposta, aprovação ou compromisso de investimento.</p></div>
        <Card className="p-6 space-y-5 shadow-lg"><h2 className="font-semibold text-lg">Converse com nossa equipe</h2>
          {enviado ? <div className="space-y-3 text-center py-8"><CheckCircle2 className="h-10 w-10 text-green-600 mx-auto" />
            <p className="font-semibold">Recebemos seu interesse.</p><p className="text-sm text-muted-foreground">Nossa equipe entrará em contato pelos dados informados.</p></div> :
          !sitekey ? <p role="alert" className="text-sm text-muted-foreground">O formulário de interesse está temporariamente indisponível.</p> :
          <form onSubmit={(e) => void enviar(e)} className="space-y-4"><div className="space-y-1"><Label htmlFor="captura-nome">Nome *</Label><Input id="captura-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={160} required /></div>
            <div className="grid sm:grid-cols-2 gap-3"><div className="space-y-1"><Label htmlFor="captura-whatsapp">WhatsApp</Label><Input id="captura-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="captura-email">E-mail</Label><Input id="captura-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1"><Label htmlFor="captura-cidade">Cidade</Label><Input id="captura-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} maxLength={120} /></div>
              <div className="space-y-1"><Label htmlFor="captura-estado">Estado</Label><Input id="captura-estado" value={estado} onChange={(e) => setEstado(e.target.value)} maxLength={80} /></div></div>
            <div className="sr-only" aria-hidden="true"><Label htmlFor="captura-empresa">Empresa</Label><Input id="captura-empresa" tabIndex={-1} autoComplete="off" value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={consentimento} onChange={(e) => setConsentimento(e.target.checked)} required className="mt-0.5" />
              Autorizo a IDM PSI a usar os dados deste formulário para entrar em contato sobre a franquia.</label>
            <div ref={container} aria-label="Verificação de segurança" />
            {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
            <Button type="submit" className="w-full" disabled={enviando || !token || !consentimento || (!whatsapp.trim() && !email.trim())}>
              {enviando ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enviando…</> : "Quero saber mais"}</Button>
          </form>}</Card></div>
    </div>
  </main>;
}
