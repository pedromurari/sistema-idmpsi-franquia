import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, Pencil } from "lucide-react";
import { toast } from "sonner";
import { RequerUnidade } from "@/components/RequerUnidade";
import { Campo, ErroCarregamento, Indicador, selectClass } from "@/components/financeiro/Shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useComercial, type Lead } from "@/hooks/useComercial";
import { useTurmas } from "@/hooks/useFinanceiro";
import { supabase } from "@/integrations/supabase/client";
import { formatData, hoje, mesAtual, type Turma } from "@/lib/financeiro";

const etapas = [
  ["lead", "Lead"], ["atendimento", "Atendimento"], ["experiencia", "Entrevista / experiência"],
  ["matricula", "Matrícula"], ["aluno", "Aluno"], ["formado", "Formado"],
  ["pos_graduacao", "Pós-graduação"], ["perdido", "Perdido"],
] as const;

export default function Comercial() {
  const { user } = useAuth();
  const { franquiaEfetiva } = useViewAs();
  if (!franquiaEfetiva) return <RequerUnidade />;
  return <ComercialUnidade key={`${user?.id}:${franquiaEfetiva}`} franquiaId={franquiaEfetiva} />;
}

function ComercialUnidade({ franquiaId }: { franquiaId: string }) {
  const { user } = useAuth();
  const [mes, setMes] = useState(mesAtual());
  const [busca, setBusca] = useState("");
  const [editando, setEditando] = useState<Lead | null | undefined>();
  const [metaTurma, setMetaTurma] = useState<Turma | null>(null);
  const comercial = useComercial(franquiaId, mes);
  const turmas = useTurmas(franquiaId);
  if (comercial.isPending || turmas.isPending) return <Loader2 aria-label="Carregando comercial" className="h-6 w-6 animate-spin mx-auto" />;
  if (comercial.isError || turmas.isError) return <ErroCarregamento retry={() => { void comercial.refetch(); void turmas.refetch(); }} />;

  const lista = comercial.data.leads.filter((lead) =>
    `${lead.nome} ${lead.email ?? ""} ${lead.telefone ?? ""}`.toLocaleLowerCase("pt-BR")
      .includes(busca.toLocaleLowerCase("pt-BR")));
  const realizados = new Map<string, Set<string>>();
  for (const item of comercial.data.etapas) {
    if (!item.turma_id) continue;
    if (!realizados.has(item.turma_id)) realizados.set(item.turma_id, new Set());
    realizados.get(item.turma_id)!.add(item.lead_id);
  }
  const totalMeta = comercial.data.metas.reduce((total, meta) => total + meta.meta_matriculas, 0);
  const totalRealizado = new Set(comercial.data.etapas.filter((item) => item.turma_id).map((item) => item.lead_id)).size;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-xl font-bold">Comercial e captação</h1>
        <p className="text-sm text-muted-foreground">Acompanhe cada contato da sua unidade até a matrícula e além.</p></div>
      <Button onClick={() => setEditando(null)} className="gap-2"><Plus className="h-4 w-4" /> Novo lead</Button>
    </div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Indicador label="Contatos no funil" value={comercial.data.leads.length} />
      <Indicador label="Matrículas no mês" value={totalRealizado} hint="Entradas na etapa matrícula com turma" />
      <Indicador label="Meta do mês" value={totalMeta || "—"} hint={totalMeta ? `${Math.round(totalRealizado / totalMeta * 100)}% alcançado` : "Defina metas por turma"} />
    </div>
    <Card className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold">Meta x realizado por turma</h2>
        <Input aria-label="Mês das metas" type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
      </div>
      {turmas.data.length === 0 ? <p className="text-sm text-muted-foreground">Cadastre uma turma para acompanhar metas e vincular leads.</p> :
        <div className="space-y-2">{turmas.data.map((turma) => {
          const meta = comercial.data.metas.find((item) => item.turma_id === turma.id);
          return <div key={turma.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-sm">
            <span className="font-medium">{turma.nome} <span className="font-normal text-muted-foreground">· {turma.curso}</span></span>
            <div className="flex items-center gap-3"><span>{realizados.get(turma.id)?.size ?? 0} / {meta?.meta_matriculas ?? "—"}</span>
              {user?.role === "franqueador" && <Button variant="outline" size="sm" onClick={() => setMetaTurma(turma)}>Definir meta</Button>}</div>
          </div>;
        })}</div>}
      <p className="text-xs text-muted-foreground">Matrícula aqui é uma etapa comercial; ainda não cria ficha de aluno nem lançamento financeiro.</p>
    </Card>
    <div className="relative max-w-sm"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
      <Input aria-label="Buscar leads" placeholder="Buscar por nome, e-mail ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
    </div>
    <div className="flex gap-3 overflow-x-auto pb-3" aria-label="Funil comercial">
      {etapas.map(([valor, titulo]) => {
        const itens = lista.filter((lead) => lead.etapa === valor);
        return <section key={valor} className="w-72 min-w-72 rounded-lg border bg-muted/30 p-3 space-y-3" aria-label={titulo}>
          <h2 className="font-semibold flex justify-between"><span>{titulo}</span><span className="text-muted-foreground">{itens.length}</span></h2>
          {itens.length === 0 && <p className="text-sm text-muted-foreground py-4">Nenhum contato</p>}
          {itens.map((lead) => <Card key={lead.id} className="p-3 space-y-2">
            <div className="flex justify-between gap-2"><strong className="text-sm break-words">{lead.nome}</strong>
              <Button variant="ghost" size="icon" aria-label={`Editar ${lead.nome}`} onClick={() => setEditando(lead)}><Pencil className="h-4 w-4" /></Button></div>
            <p className="text-xs text-muted-foreground break-all">{lead.email || lead.telefone}</p>
            {lead.turma_id && <p className="text-xs">{turmas.data.find((t) => t.id === lead.turma_id)?.nome ?? "Turma vinculada"}</p>}
            {lead.proxima_acao_em && <p className={`text-xs ${lead.proxima_acao_em < hoje() ? "text-destructive" : "text-muted-foreground"}`}>Próxima ação: {formatData(lead.proxima_acao_em)} · {lead.proxima_acao}</p>}
            {lead.score !== null && <p className="text-xs text-muted-foreground">Score: {lead.score}/100</p>}
          </Card>)}
        </section>;
      })}
    </div>
    {editando !== undefined && <LeadDialog key={editando?.id ?? "novo"} franquiaId={franquiaId} lead={editando} turmas={turmas.data} fechar={() => setEditando(undefined)} />}
    {metaTurma && <MetaDialog key={`${metaTurma.id}:${mes}`} franquiaId={franquiaId} turma={metaTurma} mes={mes}
      valorAtual={comercial.data.metas.find((item) => item.turma_id === metaTurma.id)?.meta_matriculas ?? null} fechar={() => setMetaTurma(null)} />}
  </div>;
}

function LeadDialog({ franquiaId, lead, turmas, fechar }: { franquiaId: string; lead: Lead | null; turmas: Turma[]; fechar: () => void }) {
  const client = useQueryClient();
  const [nome, setNome] = useState(lead?.nome ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");
  const [telefone, setTelefone] = useState(lead?.telefone ?? "");
  const [origem, setOrigem] = useState(lead?.origem ?? "");
  const [turmaId, setTurmaId] = useState(lead?.turma_id ?? "");
  const [etapa, setEtapa] = useState(lead?.etapa ?? "lead");
  const [score, setScore] = useState(lead?.score?.toString() ?? "");
  const [acaoEm, setAcaoEm] = useState(lead?.proxima_acao_em ?? "");
  const [acao, setAcao] = useState(lead?.proxima_acao ?? "");
  const [bolsa, setBolsa] = useState(String(lead?.bolsa_percentual ?? 0));
  const [desconto, setDesconto] = useState(String(lead?.desconto_percentual ?? 0));
  const [motivo, setMotivo] = useState(lead?.motivo_perda ?? "");
  const [observacoes, setObservacoes] = useState(lead?.observacoes ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    setErro("");
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    const telefoneLimpo = telefone.trim();
    const bolsaNumero = Number(bolsa.replace(",", "."));
    const descontoNumero = Number(desconto.replace(",", "."));
    if (nomeLimpo.length < 2 || (!emailLimpo && !telefoneLimpo)) return setErro("Informe nome e pelo menos e-mail ou telefone.");
    if (emailLimpo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) return setErro("Informe um e-mail válido.");
    if (telefoneLimpo && !/^\d{8,15}$/.test(telefoneLimpo.replace(/\D/g, ""))) return setErro("Informe um telefone com 8 a 15 dígitos.");
    if ((acaoEm && !acao.trim()) || (!acaoEm && acao.trim())) return setErro("Preencha a data e a descrição da próxima ação juntas.");
    if (etapa === "perdido" && !motivo.trim()) return setErro("Informe o motivo da perda.");
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(bolsa) || !/^\d+(?:[.,]\d{1,2})?$/.test(desconto) || bolsaNumero + descontoNumero > 100)
      return setErro("Bolsa e desconto devem somar no máximo 100%.");
    if (score && (!/^\d+$/.test(score) || Number(score) > 100)) return setErro("Score deve ser um número de 0 a 100.");
    setSalvando(true);
    const valores = { nome: nomeLimpo, email: emailLimpo || null, telefone: telefoneLimpo || null,
      origem: origem.trim() || null, turma_id: turmaId || null, score: score ? Number(score) : null,
      proxima_acao_em: acaoEm || null, proxima_acao: acao.trim() || null,
      bolsa_percentual: bolsaNumero, desconto_percentual: descontoNumero,
      motivo_perda: etapa === "perdido" ? motivo.trim() : null, observacoes: observacoes.trim() || null };
    const resultado = lead
      ? await supabase.from("franquia_leads").update({ ...valores, etapa }).eq("id", lead.id)
          .eq("franquia_id", franquiaId).eq("updated_at", lead.updated_at).select("id")
      : await supabase.from("franquia_leads").insert({ ...valores, franquia_id: franquiaId, etapa: "lead" }).select("id");
    setSalvando(false);
    if (resultado.error) {
      setErro(resultado.error.code === "23505" ? "Já existe um lead com esse e-mail ou telefone nesta unidade." : resultado.error.message);
      return;
    }
    if (!resultado.data?.length) return setErro("Este lead mudou desde que você abriu o formulário. Feche e abra novamente.");
    await client.invalidateQueries({ queryKey: ["comercial"] });
    toast.success(lead ? "Lead atualizado." : "Lead cadastrado.");
    fechar();
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !salvando) fechar(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>{lead ? "Editar lead" : "Novo lead"}</DialogTitle>
      <DialogDescription>Dados comerciais da unidade. Bolsa e desconto são propostas, sem efeito financeiro automático.</DialogDescription></DialogHeader>
    <form onSubmit={(e) => void salvar(e)} className="space-y-4"><fieldset disabled={salvando} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <Campo id="lead-nome" label="Nome *"><Input id="lead-nome" value={nome} maxLength={160} onChange={(e) => setNome(e.target.value)} required /></Campo>
        <Campo id="lead-origem" label="Origem"><Input id="lead-origem" value={origem} maxLength={120} onChange={(e) => setOrigem(e.target.value)} placeholder="Indicação, site, anúncio..." /></Campo>
        <Campo id="lead-email" label="E-mail"><Input id="lead-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
        <Campo id="lead-telefone" label="Telefone"><Input id="lead-telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Campo>
        <Campo id="lead-turma" label="Turma de interesse"><select id="lead-turma" className={selectClass} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}><option value="">Não definida</option>{turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</select></Campo>
        {lead && <Campo id="lead-etapa" label="Etapa"><select id="lead-etapa" className={selectClass} value={etapa} onChange={(e) => setEtapa(e.target.value)}>{etapas.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}</select></Campo>}
        <Campo id="lead-score" label="Score manual (0 a 100)"><Input id="lead-score" type="number" min={0} max={100} value={score} onChange={(e) => setScore(e.target.value)} /></Campo>
        <Campo id="lead-acao-data" label="Próxima ação: data"><Input id="lead-acao-data" type="date" value={acaoEm} onChange={(e) => setAcaoEm(e.target.value)} /></Campo>
        <Campo id="lead-acao" label="Próxima ação"><Input id="lead-acao" value={acao} maxLength={300} onChange={(e) => setAcao(e.target.value)} placeholder="Ligar, enviar proposta..." /></Campo>
        <Campo id="lead-bolsa" label="Bolsa proposta (%)"><Input id="lead-bolsa" inputMode="decimal" value={bolsa} onChange={(e) => setBolsa(e.target.value)} /></Campo>
        <Campo id="lead-desconto" label="Desconto proposto (%)"><Input id="lead-desconto" inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} /></Campo>
      </div>
      {etapa === "perdido" && <Campo id="lead-motivo" label="Motivo da perda *"><Input id="lead-motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>}
      <Campo id="lead-obs" label="Observações"><textarea id="lead-obs" className={`${selectClass} min-h-24`} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></Campo>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button><Button type="submit">{salvando ? "Salvando…" : "Salvar lead"}</Button></div>
    </fieldset></form>
  </DialogContent></Dialog>;
}

function MetaDialog({ franquiaId, turma, mes, valorAtual, fechar }: { franquiaId: string; turma: Turma; mes: string; valorAtual: number | null; fechar: () => void }) {
  const client = useQueryClient();
  const [valor, setValor] = useState(valorAtual?.toString() ?? "");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (!/^\d+$/.test(valor) || Number(valor) > 10000) return setErro("Informe uma meta entre 0 e 10000.");
    setSalvando(true);
    const resultado = await supabase.from("franquia_metas_turma").upsert({ franquia_id: franquiaId,
      turma_id: turma.id, competencia: `${mes}-01`, meta_matriculas: Number(valor) },
      { onConflict: "franquia_id,turma_id,competencia" });
    setSalvando(false);
    if (resultado.error) return setErro(resultado.error.message);
    await client.invalidateQueries({ queryKey: ["comercial"] });
    toast.success("Meta salva."); fechar();
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !salvando) fechar(); }}><DialogContent>
    <DialogHeader><DialogTitle>Meta de matrículas</DialogTitle><DialogDescription>{turma.nome} · {mes}</DialogDescription></DialogHeader>
    <form onSubmit={(e) => void salvar(e)} className="space-y-4"><Campo id="meta-valor" label="Matrículas previstas"><Input id="meta-valor" type="number" min={0} max={10000} value={valor} onChange={(e) => setValor(e.target.value)} required /></Campo>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button><Button disabled={salvando} type="submit">Salvar meta</Button></div></form>
  </DialogContent></Dialog>;
}
