import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { todasPaginas } from "@/lib/financeiro";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErroCarregamento } from "@/components/financeiro/Shared";

type Copy = Database["public"]["Tables"]["franquia_social_copies"]["Row"];
type Formulario = Pick<Copy, "titulo" | "briefing" | "texto_anuncio" | "chamada_acao" | "referencia_url" | "prazo" | "status" | "observacoes">;
const etapas = [
  { id: "pendente", label: "Pendente", cor: "bg-slate-600" },
  { id: "criacao", label: "Em criação", cor: "bg-blue-600" },
  { id: "revisao", label: "Em revisão", cor: "bg-amber-600" },
  { id: "aprovada", label: "Aprovada", cor: "bg-emerald-600" },
  { id: "em_uso", label: "Em uso", cor: "bg-primary" },
] as const;
const vazio = (): Formulario => ({ titulo: "", briefing: "", texto_anuncio: "", chamada_acao: "",
  referencia_url: null, prazo: null, status: "pendente", observacoes: "" });
const classeCampo = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
const dataBR = (valor: string) => `${valor.slice(8, 10)}/${valor.slice(5, 7)}/${valor.slice(0, 4)}`;

export function CopiesAnuncios() {
  const { user } = useAuth();
  const cache = useQueryClient();
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Copy | null | undefined>();
  const [form, setForm] = useState<Formulario>(vazio);
  const [salvando, setSalvando] = useState(false);
  const consulta = useQuery({ queryKey: ["social-copies"], enabled: user?.role === "franqueador",
    queryFn: ({ signal }) => todasPaginas<Copy>((de, ate) => supabase.from("franquia_social_copies")
      .select("*").order("prazo", { ascending: true, nullsFirst: false }).order("id")
      .range(de, ate).abortSignal(signal)) });
  const filtradas = (consulta.data ?? []).filter((copy) =>
    `${copy.titulo} ${copy.briefing} ${copy.texto_anuncio}`.toLocaleLowerCase("pt-BR")
      .includes(busca.toLocaleLowerCase("pt-BR")));

  function abrir(copy?: Copy) {
    setEditando(copy ?? null);
    setForm(copy ? { titulo: copy.titulo, briefing: copy.briefing, texto_anuncio: copy.texto_anuncio,
      chamada_acao: copy.chamada_acao, referencia_url: copy.referencia_url, prazo: copy.prazo,
      status: copy.status, observacoes: copy.observacoes } : vazio());
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!user || user.role !== "franqueador" || salvando) return;
    if (["aprovada", "em_uso"].includes(form.status) && !form.texto_anuncio.trim()) {
      toast.error("Escreva o texto do anúncio antes de aprovar a copy."); return;
    }
    setSalvando(true);
    const valores = { ...form, titulo: form.titulo.trim(), briefing: form.briefing.trim(),
      texto_anuncio: form.texto_anuncio.trim(), chamada_acao: form.chamada_acao.trim(),
      observacoes: form.observacoes.trim(), referencia_url: form.referencia_url?.trim() || null,
      prazo: form.prazo || null };
    const resultado = editando
      ? await supabase.from("franquia_social_copies").update(valores).eq("id", editando.id)
        .eq("updated_at", editando.updated_at).select("id")
      : await supabase.from("franquia_social_copies").insert({ ...valores, criado_por: user.id }).select("id");
    setSalvando(false);
    if (resultado.error || !resultado.data?.length) {
      toast.error("Não foi possível salvar. Atualize a página e tente novamente."); return;
    }
    setEditando(undefined);
    await cache.invalidateQueries({ queryKey: ["social-copies"] });
    toast.success(editando ? "Copy atualizada." : "Pendência criada.");
  }

  async function mudarStatus(copy: Copy, status: string) {
    if (["aprovada", "em_uso"].includes(status) && !copy.texto_anuncio.trim()) {
      toast.error("Escreva o texto do anúncio antes de aprovar a copy."); return;
    }
    const { data, error } = await supabase.from("franquia_social_copies").update({ status })
      .eq("id", copy.id).eq("updated_at", copy.updated_at).select("id");
    if (error || !data?.length) { toast.error("Não foi possível mover a copy. Atualize a página."); return; }
    await cache.invalidateQueries({ queryKey: ["social-copies"] });
  }

  if (user?.role !== "franqueador") return null;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <h2 className="text-xl font-semibold">Copies para anúncios</h2>
      <p className="text-sm text-muted-foreground">Registre briefings, escreva textos e acompanhe a aprovação das campanhas.</p>
    </div><Button onClick={() => abrir()}><Plus className="mr-2 h-4 w-4" /> Nova pendência</Button></div>
    <Input aria-label="Buscar copies" placeholder="Buscar título, briefing ou texto..." className="max-w-sm"
      value={busca} onChange={(event) => setBusca(event.target.value)} />
    {consulta.isPending && <Loader2 aria-label="Carregando copies" className="mx-auto h-6 w-6 animate-spin" />}
    {consulta.isError && <ErroCarregamento retry={() => void consulta.refetch()} />}
    {consulta.isSuccess && <>
      <p className="text-xs text-muted-foreground">{filtradas.length} copy(s) neste quadro</p>
      <div className="flex gap-3 overflow-x-auto pb-3">{etapas.map((etapa) => <section key={etapa.id}
        aria-label={etapa.label} className="w-64 shrink-0 rounded-lg border bg-muted/30">
        <h3 className={`${etapa.cor} rounded-t-lg px-3 py-2 text-sm font-semibold text-white flex justify-between`}>{etapa.label}
          <span>{filtradas.filter((copy) => copy.status === etapa.id).length}</span></h3>
        <div className="space-y-2 p-2 min-h-28">{filtradas.filter((copy) => copy.status === etapa.id).map((copy) => <Card key={copy.id} className="space-y-2 p-3">
          <button className="w-full text-left" onClick={() => abrir(copy)}><strong className="text-sm line-clamp-2">{copy.titulo}</strong>
            {copy.briefing && <span className="block text-xs text-muted-foreground line-clamp-3 mt-1">{copy.briefing}</span>}
            {copy.prazo && <span className="block text-xs text-muted-foreground mt-1">Prazo: {dataBR(copy.prazo)}</span>}</button>
          <div className="flex items-center gap-2"><select aria-label={`Status de ${copy.titulo}`} value={copy.status}
            onChange={(event) => void mudarStatus(copy, event.target.value)} className="min-w-0 flex-1 rounded border bg-background p-1 text-xs">
            {etapas.map((opcao) => <option key={opcao.id} value={opcao.id}>{opcao.label}</option>)}</select>
            {copy.referencia_url && <a href={copy.referencia_url} target="_blank" rel="noopener noreferrer"
              aria-label={`Abrir referência de ${copy.titulo}`}><ExternalLink className="h-4 w-4 text-primary" /></a>}</div>
        </Card>)}</div></section>)}</div>
      {filtradas.length === 0 && <Card className="p-8 text-center text-sm text-muted-foreground">Nenhuma copy encontrada. Crie a primeira pendência pelo botão acima.</Card>}
    </>}
    <Dialog open={editando !== undefined} onOpenChange={(aberto) => { if (!aberto) setEditando(undefined); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader>
        <DialogTitle>{editando ? "Editar copy" : "Nova pendência de copy"}</DialogTitle>
        <DialogDescription>Planejamento de anúncios exclusivo da franqueadora.</DialogDescription>
      </DialogHeader><form onSubmit={(event) => void salvar(event)} className="space-y-3">
        <div><Label htmlFor="copy-titulo">Título *</Label><Input id="copy-titulo" required minLength={2} maxLength={160}
          value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} /></div>
        <div><Label htmlFor="copy-briefing">Briefing / objetivo</Label><textarea id="copy-briefing" className={`${classeCampo} min-h-20`}
          maxLength={5000} value={form.briefing} onChange={(event) => setForm({ ...form, briefing: event.target.value })} /></div>
        <div><Label htmlFor="copy-texto">Texto do anúncio</Label><textarea id="copy-texto" className={`${classeCampo} min-h-28`}
          maxLength={5000} value={form.texto_anuncio} onChange={(event) => setForm({ ...form, texto_anuncio: event.target.value })} /></div>
        <div><Label htmlFor="copy-cta">Chamada para ação</Label><Input id="copy-cta" maxLength={300}
          value={form.chamada_acao} onChange={(event) => setForm({ ...form, chamada_acao: event.target.value })} /></div>
        <div className="grid grid-cols-2 gap-3"><div><Label htmlFor="copy-prazo">Prazo</Label><Input id="copy-prazo" type="date"
          value={form.prazo ?? ""} onChange={(event) => setForm({ ...form, prazo: event.target.value || null })} /></div>
          <div><Label htmlFor="copy-status">Etapa</Label><select id="copy-status" className={classeCampo} value={form.status}
            onChange={(event) => setForm({ ...form, status: event.target.value })}>{etapas.map((etapa) => <option key={etapa.id} value={etapa.id}>{etapa.label}</option>)}</select></div></div>
        <div><Label htmlFor="copy-referencia">Link de referência</Label><Input id="copy-referencia" type="url" maxLength={2000}
          placeholder="https://..." value={form.referencia_url ?? ""} onChange={(event) => setForm({ ...form, referencia_url: event.target.value })} /></div>
        <div><Label htmlFor="copy-observacoes">Observações internas</Label><textarea id="copy-observacoes" className={`${classeCampo} min-h-20`}
          maxLength={5000} value={form.observacoes} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} /></div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setEditando(undefined)}>Cancelar</Button>
          <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button></div>
      </form></DialogContent></Dialog>
  </div>;
}
