import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Loader2, Plus, Search, MessageCircle, Phone, Pencil, Archive, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { todasPaginas, formatCurrency } from "@/lib/financeiro";
import { dataHoraLead } from "@/lib/dataHoraLead";
import { Campo, ErroCarregamento, Indicador, selectClass } from "@/components/financeiro/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Lead = Database["public"]["Tables"]["franquia_expansao_leads"]["Row"];
type Campanha = Database["public"]["Tables"]["franquia_expansao_campanhas"]["Row"];
type Responsavel = Database["public"]["Tables"]["franquia_expansao_responsaveis"]["Row"];
const FASES = [
  { id: "novo", nome: "Novo", cor: "bg-blue-600" },
  { id: "contatado", nome: "Contatado", cor: "bg-amber-600" },
  { id: "reuniao_agendada", nome: "Reunião Agendada", cor: "bg-purple-600" },
  { id: "fechado", nome: "Fechado", cor: "bg-green-600" },
  { id: "perdido", nome: "Perdido", cor: "bg-red-600" },
] as const;

function useExpansao() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["expansao", user?.id],
    enabled: user?.role === "franqueador",
    queryFn: async ({ signal }) => {
      const [leads, campanhas, responsaveis] = await Promise.all([
        todasPaginas<Lead>((de, ate) => supabase.from("franquia_expansao_leads").select("*")
          .is("arquivado_em", null).order("created_at", { ascending: false }).order("id")
          .range(de, ate).abortSignal(signal)),
        todasPaginas<Campanha>((de, ate) => supabase.from("franquia_expansao_campanhas").select("*")
          .order("data", { ascending: false }).order("id").range(de, ate).abortSignal(signal)),
        todasPaginas<Responsavel>((de, ate) => supabase.from("franquia_expansao_responsaveis").select("*")
          .order("nome").order("id").range(de, ate).abortSignal(signal)),
      ]);
      return { leads, campanhas, responsaveis };
    },
  });
}

export default function ExpansaoFranquias() {
  const { user } = useAuth();
  const client = useQueryClient();
  const consulta = useExpansao();
  const [aba, setAba] = useState<"funil" | "campanha">("funil");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("todos");
  const [editando, setEditando] = useState<Lead | null | undefined>();
  const [campanha, setCampanha] = useState<Campanha | null | undefined>();
  const [responsaveisAberto, setResponsaveisAberto] = useState(false);
  if (user?.role !== "franqueador") return null;
  if (consulta.isPending) return <Loader2 aria-label="Carregando expansão" className="h-6 w-6 animate-spin mx-auto" />;
  if (consulta.isError) return <ErroCarregamento retry={() => void consulta.refetch()} />;
  const { leads, campanhas, responsaveis } = consulta.data;
  const encontrados = leads.filter((lead) => {
    const texto = `${lead.nome} ${lead.email ?? ""} ${lead.whatsapp ?? ""} ${lead.cidade ?? ""}`.toLocaleLowerCase("pt-BR");
    return texto.includes(busca.toLocaleLowerCase("pt-BR")) && (filtro === "todos" || (filtro === "sem" ? !lead.responsavel_id : lead.responsavel_id === filtro));
  });
  const totais = campanhas.reduce((acc, item) => ({ gasto: acc.gasto + Number(item.gasto), impressoes: acc.impressoes + item.impressoes,
    cliques: acc.cliques + item.cliques, leads: acc.leads + item.leads_count }), { gasto: 0, impressoes: 0, cliques: 0, leads: 0 });
  async function atribuir(lead: Lead, id: string) {
    const { data, error } = await supabase.from("franquia_expansao_leads")
      .update({ responsavel_id: id || null }).eq("id", lead.id).eq("updated_at", lead.updated_at).select("id");
    if (error || !data?.length) return toast.error("Não foi possível atribuir. Recarregue a página e tente novamente.");
    await client.invalidateQueries({ queryKey: ["expansao"] });
    toast.success("Responsável atualizado.");
  }
  async function mudarFase(lead: Lead, fase: string) {
    const { data, error } = await supabase.from("franquia_expansao_leads")
      .update({ fase }).eq("id", lead.id).eq("updated_at", lead.updated_at).select("id");
    if (error || !data?.length) return toast.error("O lead mudou ou você perdeu acesso. Recarregue e tente novamente.");
    await client.invalidateQueries({ queryKey: ["expansao"] });
  }
  return <div className="space-y-6 max-w-[1600px] mx-auto">
    <div className="flex flex-wrap justify-between gap-3"><div><h1 className="text-2xl font-bold">IDM PSI Franquias</h1>
      <p className="text-sm text-muted-foreground">Captação e venda de novas unidades · área ADM</p></div>
      <div className="flex gap-2"><Button variant="outline" asChild><a href="https://www.idmpsifranquia.com/" target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4 mr-2" /> Página de captura</a></Button>
        <Button variant="outline" onClick={() => { setAba("campanha"); setCampanha(null); }}><BarChart3 className="h-4 w-4 mr-2" /> Métricas</Button>
        <Button onClick={() => setEditando(null)}><Plus className="h-4 w-4 mr-2" /> Novo lead</Button></div></div>
    <Card className="p-4 border-primary/30 bg-primary/5 space-y-3"><div><p className="font-semibold">Meu trabalho</p>
      <p className="text-xs text-muted-foreground">Trabalhe os interessados, atribua responsáveis e acompanhe a campanha.</p></div>
      <div className="flex gap-2"><Button size="sm" variant={aba === "funil" ? "default" : "outline"} onClick={() => setAba("funil")}>Funil e leads</Button>
        <Button size="sm" variant={aba === "campanha" ? "default" : "outline"} onClick={() => setAba("campanha")}>Campanha</Button></div></Card>
    {aba === "funil" ? <>
      <div className="flex flex-wrap items-center gap-3"><div className="relative max-w-sm flex-1 min-w-56"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input aria-label="Buscar interessados" placeholder="Buscar lead..." value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" /></div>
        <Button size="sm" variant="outline" onClick={() => setResponsaveisAberto(true)}>Responsáveis</Button>
        <span className="text-xs text-muted-foreground">{leads.length} total · {leads.filter((l) => l.responsavel_id).length} atribuídos</span></div>
      <div className="flex flex-wrap gap-2" aria-label="Filtrar responsáveis"><Button size="sm" variant={filtro === "todos" ? "default" : "outline"} onClick={() => setFiltro("todos")}>Todos</Button>
        <Button size="sm" variant={filtro === "sem" ? "default" : "outline"} onClick={() => setFiltro("sem")}>Sem atribuição</Button>
        {responsaveis.map((r) => <Button key={r.id} size="sm" variant={filtro === r.id ? "default" : "outline"} onClick={() => setFiltro(r.id)}>{r.nome}</Button>)}</div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" aria-label="Kanban de franquias">
        {FASES.map((fase) => { const itens = encontrados.filter((lead) => lead.fase === fase.id); return <section key={fase.id} className="rounded-lg border overflow-hidden min-h-40" aria-label={fase.nome}>
          <h2 className={`${fase.cor} text-white text-sm font-semibold px-3 py-2 flex justify-between`}><span>{fase.nome}</span><span>{itens.length}</span></h2>
          <div className="p-2 space-y-2 bg-muted/20 max-h-[420px] overflow-y-auto">{itens.length === 0 && <p className="text-xs text-muted-foreground text-center py-5">Nenhum lead</p>}
            {itens.map((lead) => <Card key={lead.id} className="p-3 space-y-2"><div className="flex justify-between gap-2"><strong className="text-sm truncate">{lead.nome}</strong>
              <Button size="icon" variant="ghost" aria-label={`Editar ${lead.nome}`} onClick={() => setEditando(lead)}><Pencil className="h-4 w-4" /></Button></div>
              {lead.cidade && <p className="text-xs text-muted-foreground">{lead.cidade}{lead.estado ? `/${lead.estado}` : ""}</p>}
              <p className="text-xs text-muted-foreground">Entrada (Brasília): {dataHoraLead(lead.created_at)}</p>
              {lead.whatsapp && <div className="flex gap-1"><a className="text-xs border rounded px-2 py-1 flex-1 text-center" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}`}><MessageCircle className="inline h-3 w-3 mr-1" />WhatsApp</a>
                <a className="border rounded px-2 py-1" aria-label={`Ligar para ${lead.nome}`} href={`tel:${lead.whatsapp.replace(/\D/g, "")}`}><Phone className="h-3 w-3" /></a></div>}
              <select aria-label={`Responsável de ${lead.nome}`} className={`${selectClass} h-8 text-xs`} value={lead.responsavel_id ?? ""} onChange={(e) => void atribuir(lead, e.target.value)}><option value="">Atribuir responsável...</option>
                {responsaveis.filter((r) => r.ativo || r.id === lead.responsavel_id).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select>
              <select aria-label={`Fase de ${lead.nome}`} className={`${selectClass} h-8 text-xs`} value={lead.fase} onChange={(e) => void mudarFase(lead, e.target.value)}>{FASES.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select>
            </Card>)}</div></section>; })}
      </div>
      <Card className="p-4"><h2 className="font-semibold mb-3">Todos os leads · {encontrados.length}</h2>
        {encontrados.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum interessado encontrado.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Nome</th><th className="p-2">Contato</th><th className="p-2">Cidade</th><th className="p-2">Fase</th><th className="p-2">Responsável</th><th className="p-2">Entrada (Brasília)</th></tr></thead>
          <tbody>{encontrados.map((lead) => <tr key={lead.id} className="border-b cursor-pointer hover:bg-muted/40" onClick={() => setEditando(lead)}><td className="p-2 font-medium">{lead.nome}</td><td className="p-2">{lead.whatsapp || lead.email}</td><td className="p-2">{lead.cidade || "—"}</td>
            <td className="p-2">{FASES.find((f) => f.id === lead.fase)?.nome}</td><td className="p-2">{responsaveis.find((r) => r.id === lead.responsavel_id)?.nome || "—"}</td><td className="p-2">{dataHoraLead(lead.created_at)}</td></tr>)}</tbody></table></div>}</Card>
    </> : <>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"><Indicador label="Gasto total" value={formatCurrency(totais.gasto)} /><Indicador label="Impressões" value={totais.impressoes.toLocaleString("pt-BR")} />
        <Indicador label="Cliques" value={totais.cliques.toLocaleString("pt-BR")} /><Indicador label="Leads" value={totais.leads.toLocaleString("pt-BR")} />
        <Indicador label="CPL" value={formatCurrency(totais.leads ? totais.gasto / totais.leads : 0)} /><Indicador label="CTR" value={`${totais.impressoes ? (totais.cliques / totais.impressoes * 100).toFixed(2) : "0"}%`} /></div>
      <Card className="p-4 space-y-3"><div className="flex justify-between"><h2 className="font-semibold">Histórico de campanha</h2><Button size="sm" onClick={() => setCampanha(null)}><Plus className="h-4 w-4 mr-1" /> Registrar métricas</Button></div>
        {campanhas.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma campanha registrada.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-2">Data</th><th className="p-2">Gasto</th><th className="p-2">Impressões</th><th className="p-2">Cliques</th><th className="p-2">Leads</th><th className="p-2">CPL</th><th className="p-2">CTR</th><th className="p-2">Ação</th></tr></thead>
          <tbody>{campanhas.map((item) => <tr key={item.id} className="border-b"><td className="p-2">{item.data.split("-").reverse().join("/")}</td><td className="p-2">{formatCurrency(Number(item.gasto))}</td><td className="p-2">{item.impressoes}</td><td className="p-2">{item.cliques}</td><td className="p-2">{item.leads_count}</td><td className="p-2">{formatCurrency(Number(item.cpl))}</td><td className="p-2">{Number(item.ctr).toFixed(2)}%</td>
            <td className="p-2"><Button size="sm" variant="ghost" onClick={() => setCampanha(item)}>Editar</Button></td></tr>)}</tbody></table></div>}</Card>
    </>}
    {editando !== undefined && <LeadDialog key={editando?.id ?? "novo"} lead={editando} responsaveis={responsaveis} fechar={() => setEditando(undefined)} />}
    {campanha !== undefined && <CampanhaDialog key={campanha?.id ?? "nova"} campanha={campanha} fechar={() => setCampanha(undefined)} />}
    {responsaveisAberto && <ResponsaveisDialog responsaveis={responsaveis} fechar={() => setResponsaveisAberto(false)} />}
  </div>;
}

function LeadDialog({ lead, responsaveis, fechar }: { lead: Lead | null; responsaveis: Responsavel[]; fechar: () => void }) {
  const client = useQueryClient();
  const { user } = useAuth();
  const [nome, setNome] = useState(lead?.nome ?? "");
  const [whatsapp, setWhatsapp] = useState(lead?.whatsapp ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [cidade, setCidade] = useState(lead?.cidade ?? "");
  const [estado, setEstado] = useState(lead?.estado ?? "");
  const [fase, setFase] = useState(lead?.fase ?? "novo");
  const [responsavelId, setResponsavelId] = useState(lead?.responsavel_id ?? "");
  const [observacoes, setObservacoes] = useState(lead?.observacoes ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    if (nome.trim().length < 2 || (!whatsapp.trim() && !email.trim())) return setErro("Informe nome e WhatsApp ou e-mail.");
    if (whatsapp.trim() && !/^\d{8,15}$/.test(whatsapp.replace(/\D/g, ""))) return setErro("WhatsApp deve ter 8 a 15 dígitos.");
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setErro("Informe um e-mail válido.");
    setSalvando(true); setErro("");
    const valores = { nome: nome.trim(), whatsapp: whatsapp.trim() || null, email: email.trim().toLowerCase() || null,
      cidade: cidade.trim() || null, estado: estado.trim() || null, fase, responsavel_id: responsavelId || null, observacoes: observacoes.trim() || null };
    const resultado = lead ? await supabase.from("franquia_expansao_leads").update(valores).eq("id", lead.id).eq("updated_at", lead.updated_at).select("id")
      : await supabase.from("franquia_expansao_leads").insert({ ...valores, criado_por: user!.id }).select("id");
    setSalvando(false);
    if (resultado.error) return setErro(resultado.error.message);
    if (!resultado.data?.length) return setErro("O lead foi alterado. Reabra o formulário antes de salvar.");
    await client.invalidateQueries({ queryKey: ["expansao"] }); toast.success("Lead salvo."); fechar();
  }
  async function arquivar() {
    if (!lead || salvando) return;
    setSalvando(true);
    const { data, error } = await supabase.from("franquia_expansao_leads").update({ arquivado_em: new Date().toISOString() }).eq("id", lead.id).eq("updated_at", lead.updated_at).select("id");
    setSalvando(false);
    if (error || !data?.length) return setErro("Não foi possível arquivar. Reabra o lead e tente novamente.");
    await client.invalidateQueries({ queryKey: ["expansao"] }); toast.success("Lead arquivado."); fechar();
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !salvando) fechar(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{lead ? "Editar interessado" : "Novo interessado"}</DialogTitle>
    <DialogDescription>Lead para compra de franquia. Estes contatos são visíveis somente à administração.
      {lead && <span className="block mt-1">Entrada: {dataHoraLead(lead.created_at)} (Brasília)</span>}</DialogDescription></DialogHeader>
    <form onSubmit={(e) => void salvar(e)} className="space-y-4"><fieldset disabled={salvando} className="space-y-4"><div className="grid gap-3 sm:grid-cols-2">
      <Campo id="exp-nome" label="Nome *"><Input id="exp-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={160} required /></Campo>
      <Campo id="exp-whatsapp" label="WhatsApp"><Input id="exp-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></Campo>
      <Campo id="exp-email" label="E-mail"><Input id="exp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
      <Campo id="exp-cidade" label="Cidade"><Input id="exp-cidade" value={cidade} maxLength={120} onChange={(e) => setCidade(e.target.value)} /></Campo>
      <Campo id="exp-estado" label="Estado"><Input id="exp-estado" value={estado} maxLength={80} onChange={(e) => setEstado(e.target.value)} /></Campo>
      <Campo id="exp-fase" label="Fase"><select id="exp-fase" className={selectClass} value={fase} onChange={(e) => setFase(e.target.value)}>{FASES.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}</select></Campo>
      <Campo id="exp-responsavel" label="Responsável"><select id="exp-responsavel" className={selectClass} value={responsavelId} onChange={(e) => setResponsavelId(e.target.value)}><option value="">Sem atribuição</option>{responsaveis.filter((r) => r.ativo || r.id === responsavelId).map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}</select></Campo>
    </div><Campo id="exp-obs" label="Observações"><textarea id="exp-obs" className={`${selectClass} min-h-24`} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></Campo>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-between gap-2">{lead ? <Button type="button" variant="outline" onClick={() => void arquivar()}><Archive className="h-4 w-4 mr-1" /> Arquivar</Button> : <span />}
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button><Button type="submit">Salvar</Button></div></div>
    </fieldset></form></DialogContent></Dialog>;
}

function CampanhaDialog({ campanha, fechar }: { campanha: Campanha | null; fechar: () => void }) {
  const client = useQueryClient();
  const [data, setData] = useState(campanha?.data ?? new Date().toISOString().slice(0, 10));
  const [gasto, setGasto] = useState(String(campanha?.gasto ?? 0));
  const [impressoes, setImpressoes] = useState(String(campanha?.impressoes ?? 0));
  const [cliques, setCliques] = useState(String(campanha?.cliques ?? 0));
  const [leads, setLeads] = useState(String(campanha?.leads_count ?? 0));
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(gasto) || [impressoes, cliques, leads].some((n) => !/^\d+$/.test(n))) return setErro("Use números não negativos; gasto aceita até duas casas decimais.");
    setSalvando(true); setErro("");
    const valores = { data, gasto: Number(gasto.replace(",", ".")), impressoes: Number(impressoes), cliques: Number(cliques), leads_count: Number(leads) };
    const resultado = campanha ? await supabase.from("franquia_expansao_campanhas").update(valores).eq("id", campanha.id).eq("updated_at", campanha.updated_at).select("id")
      : await supabase.from("franquia_expansao_campanhas").insert(valores).select("id");
    setSalvando(false);
    if (resultado.error) return setErro(resultado.error.message);
    if (!resultado.data?.length) return setErro("Este registro mudou. Reabra antes de salvar.");
    await client.invalidateQueries({ queryKey: ["expansao"] }); toast.success("Métricas salvas."); fechar();
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !salvando) fechar(); }}><DialogContent><DialogHeader><DialogTitle>{campanha ? "Editar métricas" : "Registrar métricas"}</DialogTitle></DialogHeader>
    <form onSubmit={(e) => void salvar(e)} className="space-y-4"><fieldset disabled={salvando} className="space-y-4"><Campo id="camp-data" label="Data"><Input id="camp-data" type="date" value={data} onChange={(e) => setData(e.target.value)} required /></Campo>
      <div className="grid grid-cols-2 gap-3"><Campo id="camp-gasto" label="Gasto (R$)"><Input id="camp-gasto" inputMode="decimal" value={gasto} onChange={(e) => setGasto(e.target.value)} /></Campo>
        <Campo id="camp-leads" label="Leads"><Input id="camp-leads" type="number" min={0} value={leads} onChange={(e) => setLeads(e.target.value)} /></Campo>
        <Campo id="camp-imp" label="Impressões"><Input id="camp-imp" type="number" min={0} value={impressoes} onChange={(e) => setImpressoes(e.target.value)} /></Campo>
        <Campo id="camp-cliques" label="Cliques"><Input id="camp-cliques" type="number" min={0} value={cliques} onChange={(e) => setCliques(e.target.value)} /></Campo></div>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button><Button type="submit">Salvar</Button></div>
    </fieldset></form></DialogContent></Dialog>;
}

function ResponsaveisDialog({ responsaveis, fechar }: { responsaveis: Responsavel[]; fechar: () => void }) {
  const client = useQueryClient();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function adicionar(event: FormEvent) {
    event.preventDefault();
    if (nome.trim().length < 2) return setErro("Informe o nome do responsável.");
    setSalvando(true);
    const { error } = await supabase.from("franquia_expansao_responsaveis").insert({ nome: nome.trim() });
    setSalvando(false);
    if (error) return setErro(error.code === "23505" ? "Esse responsável já existe." : error.message);
    setNome(""); setErro(""); await client.invalidateQueries({ queryKey: ["expansao"] });
  }
  return <Dialog open onOpenChange={(open) => { if (!open) fechar(); }}><DialogContent><DialogHeader><DialogTitle>Responsáveis pela expansão</DialogTitle><DialogDescription>Podem receber leads sem precisar de login neste portal.</DialogDescription></DialogHeader>
    <div className="space-y-3">{responsaveis.map((r) => <p key={r.id} className="text-sm border-b pb-2">{r.nome}{r.ativo ? "" : " (inativo)"}</p>)}</div>
    <form onSubmit={(e) => void adicionar(e)} className="space-y-3"><Campo id="responsavel-nome" label="Novo responsável"><Input id="responsavel-nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={120} /></Campo>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}<Button disabled={salvando} type="submit">Adicionar</Button></form></DialogContent></Dialog>;
}
