import { useState, type FormEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Pencil, Search } from "lucide-react";
import { toast } from "sonner";
import { RequerUnidade } from "@/components/RequerUnidade";
import { Campo, ErroCarregamento, Indicador, cabecalhoTabela, selectClass } from "@/components/financeiro/Shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/contexts/AuthContext";
import { useViewAs } from "@/contexts/ViewAsContext";
import { useAlunos, type Aluno, type LeadElegivel } from "@/hooks/useAlunos";
import { useTurmas } from "@/hooks/useFinanceiro";
import { supabase } from "@/integrations/supabase/client";
import { formatData, hoje, type Turma } from "@/lib/financeiro";

const statusRotulo: Record<string, string> = {
  lista_espera: "Lista de espera", ativo: "Ativo", trancado: "Trancado", formado: "Formado", desistente: "Desistente",
};
const statusVariant: Record<string, "default" | "outline" | "secondary" | "destructive"> = {
  lista_espera: "outline", ativo: "default", trancado: "secondary", formado: "default", desistente: "destructive",
};

export default function Alunos() {
  const { user } = useAuth();
  const { franquiaEfetiva } = useViewAs();
  if (!franquiaEfetiva) return <RequerUnidade />;
  return <AlunosUnidade key={`${user?.id}:${franquiaEfetiva}`} franquiaId={franquiaEfetiva} />;
}

function AlunosUnidade({ franquiaId }: { franquiaId: string }) {
  const { user } = useAuth();
  const podeEditar = user?.role !== "vendedor";
  const alunosQuery = useAlunos(franquiaId);
  const turmasQuery = useTurmas(franquiaId);
  const [busca, setBusca] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("todos");
  const [turmaFiltro, setTurmaFiltro] = useState("todas");
  const [editando, setEditando] = useState<Aluno | null | undefined>();

  if (alunosQuery.isPending || turmasQuery.isPending) return <Loader2 aria-label="Carregando alunos" className="h-6 w-6 animate-spin mx-auto" />;
  if (alunosQuery.isError || turmasQuery.isError)
    return <ErroCarregamento retry={() => { void alunosQuery.refetch(); void turmasQuery.refetch(); }} />;

  const { alunos, leadsElegiveis } = alunosQuery.data;
  const turmas = turmasQuery.data;
  const lista = alunos.filter((aluno) =>
    (statusFiltro === "todos" || aluno.status === statusFiltro) &&
    (turmaFiltro === "todas" || aluno.turma_id === turmaFiltro || (turmaFiltro === "sem-turma" && !aluno.turma_id)) &&
    `${aluno.nome} ${aluno.cpf ?? ""} ${aluno.email ?? ""} ${aluno.telefone ?? ""}`.toLocaleLowerCase("pt-BR")
      .includes(busca.toLocaleLowerCase("pt-BR")));
  const ativos = alunos.filter((a) => a.status === "ativo").length;
  const listaEspera = alunos.filter((a) => a.status === "lista_espera").length;
  const formados = alunos.filter((a) => a.status === "formado").length;

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-xl font-bold">Alunos</h1>
        <p className="text-sm text-muted-foreground">Ficha de cada aluno da unidade, turma e situação da matrícula.</p></div>
      {podeEditar && <Button onClick={() => setEditando(null)} className="gap-2"><Plus className="h-4 w-4" /> Nova ficha</Button>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Indicador label="Total de alunos" value={alunos.length} />
      <Indicador label="Ativos" value={ativos} />
      <Indicador label="Lista de espera" value={listaEspera} />
      <Indicador label="Formados" value={formados} />
    </div>
    <Card className="p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input aria-label="Buscar aluno" placeholder="Nome, CPF, e-mail ou telefone" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" /></div>
        <Campo id="filtro-status" label="Status"><select id="filtro-status" className={selectClass} value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)}>
          <option value="todos">Todos os status</option>
          {Object.entries(statusRotulo).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select></Campo>
        <Campo id="filtro-turma" label="Turma"><select id="filtro-turma" className={selectClass} value={turmaFiltro} onChange={(e) => setTurmaFiltro(e.target.value)}>
          <option value="todas">Todas as turmas</option>
          <option value="sem-turma">Sem turma</option>
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select></Campo>
      </div>
    </Card>
    <Card>
      <Table>
        <TableHeader><TableRow className={cabecalhoTabela}>
          <TableHead>Nome</TableHead><TableHead>Contato</TableHead><TableHead>Turma</TableHead>
          <TableHead>Status</TableHead><TableHead>Matrícula</TableHead><TableHead><span className="sr-only">Ações</span></TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {lista.length === 0 && <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Nenhum aluno encontrado no filtro atual.</TableCell></TableRow>}
          {lista.map((aluno) => <TableRow key={aluno.id}>
            <TableCell><p className="font-semibold">{aluno.nome}</p>{aluno.cpf && <p className="text-xs text-muted-foreground">CPF: {aluno.cpf}</p>}</TableCell>
            <TableCell className="text-sm">{aluno.email || "—"}{aluno.telefone ? ` · ${aluno.telefone}` : ""}</TableCell>
            <TableCell>{turmas.find((t) => t.id === aluno.turma_id)?.nome ?? "—"}</TableCell>
            <TableCell><Badge variant={statusVariant[aluno.status]}>{statusRotulo[aluno.status]}</Badge></TableCell>
            <TableCell>{formatData(aluno.data_matricula)}</TableCell>
            <TableCell>{podeEditar && <Button variant="ghost" size="sm" aria-label={`Editar ${aluno.nome}`} onClick={() => setEditando(aluno)}>
              <Pencil className="h-4 w-4 mr-2" />Editar</Button>}</TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </Card>
    {editando !== undefined && <AlunoDialog franquiaId={franquiaId} aluno={editando} turmas={turmas} leadsElegiveis={leadsElegiveis} fechar={() => setEditando(undefined)} />}
  </div>;
}

function AlunoDialog({ franquiaId, aluno, turmas, leadsElegiveis, fechar }:
  { franquiaId: string; aluno: Aluno | null; turmas: Turma[]; leadsElegiveis: LeadElegivel[]; fechar: () => void }) {
  const client = useQueryClient();
  const [leadId, setLeadId] = useState("");
  const [nome, setNome] = useState(aluno?.nome ?? "");
  const [cpf, setCpf] = useState(aluno?.cpf ?? "");
  const [email, setEmail] = useState(aluno?.email ?? "");
  const [telefone, setTelefone] = useState(aluno?.telefone ?? "");
  const [dataNascimento, setDataNascimento] = useState(aluno?.data_nascimento ?? "");
  const [endereco, setEndereco] = useState(aluno?.endereco ?? "");
  const [turmaId, setTurmaId] = useState(aluno?.turma_id ?? "");
  const [status, setStatus] = useState(aluno?.status ?? "ativo");
  const [dataMatricula, setDataMatricula] = useState(aluno?.data_matricula ?? hoje());
  const [dataConclusao, setDataConclusao] = useState(aluno?.data_conclusao_prevista ?? "");
  const [motivoStatus, setMotivoStatus] = useState(aluno?.motivo_status ?? "");
  const [observacoes, setObservacoes] = useState(aluno?.observacoes ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  function aplicarLead(id: string) {
    setLeadId(id);
    const lead = leadsElegiveis.find((l) => l.id === id);
    if (!lead) return;
    setNome(lead.nome);
    setEmail(lead.email ?? "");
    setTelefone(lead.telefone ?? "");
    if (lead.turma_id) setTurmaId(lead.turma_id);
  }

  async function salvar(event: FormEvent) {
    event.preventDefault();
    if (salvando) return;
    setErro("");
    const nomeLimpo = nome.trim();
    const emailLimpo = email.trim().toLowerCase();
    const telefoneLimpo = telefone.trim();
    const cpfLimpo = cpf.trim();
    if (nomeLimpo.length < 2 || (!emailLimpo && !telefoneLimpo)) return setErro("Informe nome e pelo menos e-mail ou telefone.");
    if (emailLimpo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailLimpo)) return setErro("Informe um e-mail válido.");
    if (telefoneLimpo && !/^\d{8,15}$/.test(telefoneLimpo.replace(/\D/g, ""))) return setErro("Informe um telefone com 8 a 15 dígitos.");
    if (cpfLimpo && !/^\d{11}$/.test(cpfLimpo.replace(/\D/g, ""))) return setErro("CPF deve ter 11 dígitos.");
    if (!dataMatricula) return setErro("Informe a data de matrícula.");
    if ((status === "trancado" || status === "desistente") && !motivoStatus.trim()) return setErro("Informe o motivo.");
    setSalvando(true);
    const valores = {
      nome: nomeLimpo, cpf: cpfLimpo || null, email: emailLimpo || null, telefone: telefoneLimpo || null,
      data_nascimento: dataNascimento || null, endereco: endereco.trim() || null, turma_id: turmaId || null,
      status, data_matricula: dataMatricula, data_conclusao_prevista: dataConclusao || null,
      motivo_status: (status === "trancado" || status === "desistente") ? motivoStatus.trim() : null,
      observacoes: observacoes.trim() || null,
    };
    const resultado = aluno
      ? await supabase.from("franquia_alunos").update(valores).eq("id", aluno.id)
          .eq("franquia_id", franquiaId).eq("updated_at", aluno.updated_at).select("id")
      : await supabase.from("franquia_alunos").insert({ ...valores, franquia_id: franquiaId, lead_id: leadId || null }).select("id");
    setSalvando(false);
    if (resultado.error) {
      const codigo = resultado.error.code;
      setErro(codigo === "23505" ? "Já existe uma ficha com esse CPF (ou para esse lead) nesta unidade."
        : resultado.error.message.includes("vagas disponíveis") ? resultado.error.message
        : resultado.error.message);
      return;
    }
    if (!resultado.data?.length) return setErro("Esta ficha mudou desde que você abriu o formulário. Feche e abra novamente.");
    await client.invalidateQueries({ queryKey: ["alunos"] });
    toast.success(aluno ? "Ficha atualizada." : "Aluno cadastrado.");
    fechar();
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !salvando) fechar(); }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
    <DialogHeader><DialogTitle>{aluno ? "Editar ficha" : "Nova ficha de aluno"}</DialogTitle>
      <DialogDescription>Dados do aluno nesta unidade. Documentos e contrato digital ainda não fazem parte desta ficha.</DialogDescription></DialogHeader>
    <form onSubmit={(e) => void salvar(e)} className="space-y-4"><fieldset disabled={salvando} className="space-y-4">
      {!aluno && leadsElegiveis.length > 0 &&
        <Campo id="aluno-lead" label="A partir de um lead já matriculado (opcional)">
          <select id="aluno-lead" className={selectClass} value={leadId} onChange={(e) => aplicarLead(e.target.value)}>
            <option value="">Cadastro manual</option>
            {leadsElegiveis.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
        </Campo>}
      <div className="grid sm:grid-cols-2 gap-4">
        <Campo id="aluno-nome" label="Nome *"><Input id="aluno-nome" value={nome} maxLength={160} onChange={(e) => setNome(e.target.value)} required /></Campo>
        <Campo id="aluno-cpf" label="CPF"><Input id="aluno-cpf" value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="Somente números" /></Campo>
        <Campo id="aluno-email" label="E-mail"><Input id="aluno-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Campo>
        <Campo id="aluno-telefone" label="Telefone"><Input id="aluno-telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} /></Campo>
        <Campo id="aluno-nascimento" label="Data de nascimento"><Input id="aluno-nascimento" type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} /></Campo>
        <Campo id="aluno-turma" label="Turma"><select id="aluno-turma" className={selectClass} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
          <option value="">Sem turma / lista de espera</option>{turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}{t.capacidade ? ` · ${t.capacidade} vaga(s)` : ""}</option>)}
        </select></Campo>
        <Campo id="aluno-status" label="Status"><select id="aluno-status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value)}>
          {Object.entries(statusRotulo).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select></Campo>
        <Campo id="aluno-matricula" label="Data de matrícula *"><Input id="aluno-matricula" type="date" value={dataMatricula} onChange={(e) => setDataMatricula(e.target.value)} required /></Campo>
        <Campo id="aluno-conclusao" label="Conclusão prevista"><Input id="aluno-conclusao" type="date" value={dataConclusao} onChange={(e) => setDataConclusao(e.target.value)} /></Campo>
      </div>
      <Campo id="aluno-endereco" label="Endereço"><Input id="aluno-endereco" value={endereco} maxLength={300} onChange={(e) => setEndereco(e.target.value)} /></Campo>
      {(status === "trancado" || status === "desistente") &&
        <Campo id="aluno-motivo" label="Motivo *"><Input id="aluno-motivo" value={motivoStatus} onChange={(e) => setMotivoStatus(e.target.value)} required /></Campo>}
      <Campo id="aluno-obs" label="Observações"><textarea id="aluno-obs" className={`${selectClass} min-h-24`} value={observacoes} onChange={(e) => setObservacoes(e.target.value)} /></Campo>
      {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={fechar}>Cancelar</Button><Button type="submit">{salvando ? "Salvando…" : "Salvar ficha"}</Button></div>
    </fieldset></form>
  </DialogContent></Dialog>;
}
