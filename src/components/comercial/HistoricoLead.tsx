import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead } from "@/hooks/useComercial";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { todasPaginas } from "@/lib/financeiro";

type Atividade = Database["public"]["Tables"]["franquia_lead_atividades"]["Row"];
type Etapa = Database["public"]["Tables"]["franquia_lead_etapas"]["Row"];
type Mensagem = Database["public"]["Tables"]["franquia_lead_mensagens"]["Row"];

function whatsapp(telefone: string | null) {
  const digitos = telefone?.replace(/\D/g, "") ?? "";
  if (digitos.length < 8 || digitos.length > 15) return null;
  return `https://wa.me/${digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos}`;
}

function ChatWhatsApp({ lead }: { lead: Lead }) {
  const client = useQueryClient();
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const mensagens = useQuery({
    queryKey: ["comercial-whatsapp", lead.franquia_id, lead.id],
    queryFn: async ({ signal }) => todasPaginas<Mensagem>((de, ate) => supabase.from("franquia_lead_mensagens").select("*")
      .eq("franquia_id", lead.franquia_id).eq("lead_id", lead.id)
      .order("created_at", { ascending: true }).order("id").range(de, ate).abortSignal(signal)),
    refetchInterval: 6000, // sem realtime por ora -- poll simples enquanto o diálogo está aberto
  });

  async function enviar(event: FormEvent) {
    event.preventDefault();
    const mensagem = texto.trim();
    if (!mensagem || enviando) return;
    setEnviando(true);
    const { error } = await supabase.functions.invoke("franquia-whatsapp-enviar", { body: { leadId: lead.id, texto: mensagem } });
    setEnviando(false);
    if (error) { toast.error("Não foi possível enviar pelo WhatsApp agora."); return; }
    setTexto("");
    await client.invalidateQueries({ queryKey: ["comercial-whatsapp", lead.franquia_id, lead.id] });
  }

  return <div className="space-y-2">
    <div className="max-h-56 overflow-y-auto space-y-1.5 rounded-md border bg-muted/30 p-2">
      {mensagens.isPending && <Loader2 aria-label="Carregando conversa" className="h-4 w-4 animate-spin" />}
      {mensagens.data?.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma mensagem ainda.</p>}
      {mensagens.data?.map((m) => <div key={m.id} className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm ${m.direcao === "enviada" ? "ml-auto bg-primary/15" : "bg-background border"}`}>
        <p className="whitespace-pre-wrap break-words">{m.conteudo}</p>
        <time className="block text-[10px] text-muted-foreground mt-0.5">{new Date(m.created_at).toLocaleString("pt-BR")}</time>
      </div>)}
    </div>
    <form onSubmit={(event) => void enviar(event)} className="flex gap-2">
      <Input aria-label="Mensagem de WhatsApp" placeholder="Escreva uma mensagem..." value={texto}
        maxLength={4096} onChange={(event) => setTexto(event.target.value)} disabled={enviando} />
      <Button type="submit" size="sm" disabled={enviando || !texto.trim()}>{enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}</Button>
    </form>
  </div>;
}

export function HistoricoLead({ lead, fechar }: { lead: Lead; fechar: () => void }) {
  const { user } = useAuth();
  const client = useQueryClient();
  const [tipo, setTipo] = useState<"ligacao" | "nota">("ligacao");
  const [resultado, setResultado] = useState("atendeu");
  const [nota, setNota] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const historico = useQuery({
    queryKey: ["comercial-historico", user?.id, lead.franquia_id, lead.id],
    queryFn: async ({ signal }) => {
      const [atividades, etapas] = await Promise.all([
        todasPaginas<Atividade>((de, ate) => supabase.from("franquia_lead_atividades").select("*")
          .eq("franquia_id", lead.franquia_id).eq("lead_id", lead.id)
          .order("created_at", { ascending: false }).order("id").range(de, ate).abortSignal(signal)),
        todasPaginas<Etapa>((de, ate) => supabase.from("franquia_lead_etapas").select("*")
          .eq("franquia_id", lead.franquia_id).eq("lead_id", lead.id)
          .order("created_at", { ascending: false }).order("id").range(de, ate).abortSignal(signal)),
      ]);
      return [
        ...atividades.map((item) => ({ id: `a-${item.id}`, data: item.created_at,
          texto: item.tipo === "ligacao" ? `Ligação: ${item.resultado?.replace(/_/g, " ")}` : "Nota",
          detalhe: item.nota })),
        ...etapas.map((item) => ({ id: `e-${item.id}`, data: item.created_at,
          texto: item.etapa_anterior ? `Etapa: ${item.etapa_anterior} → ${item.etapa_nova}` : `Entrada no funil: ${item.etapa_nova}`,
          detalhe: null })),
      ].sort((a, b) => b.data.localeCompare(a.data));
    },
    enabled: !!user,
  });
  const link = whatsapp(lead.telefone);

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    const notaLimpa = nota.trim();
    if (tipo === "nota" && !notaLimpa) return setErro("Escreva a nota antes de salvar.");
    setSalvando(true);
    setErro("");
    const { error } = await supabase.from("franquia_lead_atividades").insert({
      franquia_id: lead.franquia_id, lead_id: lead.id, tipo,
      resultado: tipo === "ligacao" ? resultado : null, nota: notaLimpa || null,
    });
    setSalvando(false);
    if (error) return setErro(error.message);
    setNota("");
    await client.invalidateQueries({ queryKey: ["comercial-historico", user?.id, lead.franquia_id, lead.id] });
    toast.success("Atividade registrada.");
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !salvando) fechar(); }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>Histórico de {lead.nome}</DialogTitle>
        <DialogDescription>Registre contatos e notas. O histórico fica preservado para a equipe da unidade.</DialogDescription></DialogHeader>
      <div className="space-y-2">
        <div className="flex items-center justify-between"><h3 className="font-semibold text-sm">WhatsApp</h3>
          {link && <a href={link} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground underline underline-offset-2">abrir no app</a>}</div>
        <ChatWhatsApp lead={lead} />
      </div>
      <form onSubmit={(event) => void salvar(event)} className="space-y-3">
        <div className="flex gap-2"><Button type="button" size="sm" variant={tipo === "ligacao" ? "default" : "outline"} onClick={() => setTipo("ligacao")}>Ligação</Button>
          <Button type="button" size="sm" variant={tipo === "nota" ? "default" : "outline"} onClick={() => setTipo("nota")}>Nota</Button></div>
        {tipo === "ligacao" && <label className="block text-sm">Resultado da ligação
          <select aria-label="Resultado da ligação" className="mt-1 w-full rounded-md border bg-background px-3 py-2" value={resultado} onChange={(event) => setResultado(event.target.value)}>
            <option value="atendeu">Atendeu</option><option value="nao_atendeu">Não atendeu</option><option value="sem_resposta">Sem resposta</option>
          </select></label>}
        <label className="block text-sm">{tipo === "nota" ? "Nota" : "Detalhes (opcional)"}
          <Input aria-label="Detalhes do contato" value={nota} maxLength={2000} onChange={(event) => setNota(event.target.value)} /></label>
        {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
        <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Registrar atividade"}</Button>
      </form>
      <div className="border-t pt-3 space-y-3"><h3 className="font-semibold">Linha do tempo</h3>
        {historico.isPending && <Loader2 aria-label="Carregando histórico" className="h-5 w-5 animate-spin" />}
        {historico.isError && <Button variant="outline" size="sm" onClick={() => void historico.refetch()}>Tentar novamente</Button>}
        {historico.data?.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma atividade ainda.</p>}
        {historico.data?.map((item) => <div key={item.id} className="border-l-2 pl-3 text-sm">
          <div className="flex flex-wrap justify-between gap-2"><strong>{item.texto}</strong><time className="text-muted-foreground">{new Date(item.data).toLocaleString("pt-BR")}</time></div>
          {item.detalhe && <p className="whitespace-pre-wrap break-words">{item.detalhe}</p>}
        </div>)}
      </div>
    </DialogContent>
  </Dialog>;
}
