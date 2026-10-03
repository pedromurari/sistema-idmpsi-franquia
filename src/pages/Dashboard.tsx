import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Building2, TrendingUp, TrendingDown, FileText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { todasPaginas } from '@/lib/financeiro';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Lancamento { franquia_id: string; tipo: string; valor: number; }
interface NotaStatus { franquia_id: string; status: string; }
interface Unidade { id: string; nome: string; ativo: boolean; }

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone?: 'success' | 'destructive' | 'default' }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
        tone === 'success' ? 'bg-success/10 text-success' : tone === 'destructive' ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
      }`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase text-muted-foreground truncate">{label}</p>
        <p className="text-xl font-bold truncate">{value}</p>
      </div>
    </Card>
  );
}

/** Resumo de uma única unidade -- usado tanto pro franqueado (a própria) quanto
 * pro franqueador quando está "vendo como" uma unidade específica. */
function ResumoUnidade({ franquiaId }: { franquiaId: string }) {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [notas, setNotas] = useState<NotaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    setLoading(true);
    setErro(false);
    Promise.all([
      todasPaginas<Lancamento>((de, ate) => supabase.from('franquia_dre_lancamentos')
        .select('id, franquia_id, tipo, valor').eq('franquia_id', franquiaId).order('id').range(de, ate)),
      todasPaginas<NotaStatus>((de, ate) => supabase.from('franquia_notas_fiscais')
        .select('id, franquia_id, status').eq('franquia_id', franquiaId).order('id').range(de, ate)),
    ]).then(([dre, nf]) => {
      if (!ativo) return;
      setLancamentos(dre);
      setNotas(nf);
      setLoading(false);
    }).catch((falha) => {
      if (!ativo) return;
      console.error('Erro ao carregar resumo da unidade:', falha);
      setErro(true); setLoading(false);
    });
    return () => { ativo = false; };
  }, [franquiaId]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (erro) return <Card role="alert" className="p-6">Não foi possível carregar o resumo desta unidade. Atualize a página e tente novamente.</Card>;

  const receita = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
  const despesa = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
  const notasPendentes = notas.filter((n) => n.status === 'pendente').length;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Receita total" value={formatCurrency(receita)} tone="success" />
        <StatCard icon={TrendingDown} label="Despesa total" value={formatCurrency(despesa)} tone="destructive" />
        <StatCard icon={TrendingUp} label="Resultado" value={formatCurrency(receita - despesa)} tone={receita - despesa >= 0 ? 'success' : 'destructive'} />
        <StatCard icon={FileText} label="Notas pendentes" value={String(notasPendentes)} />
      </div>
      <div className="flex gap-3 text-sm">
        <Link to="/dre" className="text-primary underline">Ver DRE completo</Link>
        <Link to="/notas" className="text-primary underline">Ver notas fiscais</Link>
      </div>
    </div>
  );
}

/** Visão de rede -- franqueador sem nenhuma unidade escolhida no "ver como". */
function ResumoRede() {
  const navigate = useNavigate();
  const { setViewAsId } = useViewAs();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [notas, setNotas] = useState<NotaStatus[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let ativo = true;
    Promise.all([
      todasPaginas<Lancamento>((de, ate) => supabase.from('franquia_dre_lancamentos')
        .select('id, franquia_id, tipo, valor').order('id').range(de, ate)),
      todasPaginas<NotaStatus>((de, ate) => supabase.from('franquia_notas_fiscais')
        .select('id, franquia_id, status').order('id').range(de, ate)),
      todasPaginas<Unidade>((de, ate) => supabase.from('franquias')
        .select('id, nome, ativo').order('id').range(de, ate)),
    ]).then(([dre, nf, un]) => {
      if (!ativo) return;
      setLancamentos(dre);
      setNotas(nf);
      setUnidades(un);
      setLoading(false);
    }).catch((falha) => {
      if (!ativo) return;
      console.error('Erro ao carregar resumo da rede:', falha);
      setErro(true); setLoading(false);
    });
    return () => { ativo = false; };
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }
  if (erro) return <Card role="alert" className="p-6">Não foi possível carregar o resumo da rede. Atualize a página e tente novamente.</Card>;

  const receita = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
  const despesa = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
  const notasPendentes = notas.filter((n) => n.status === 'pendente').length;

  const porUnidade = unidades.map((u) => {
    const doUnidade = lancamentos.filter((l) => l.franquia_id === u.id);
    const r = doUnidade.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
    const d = doUnidade.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
    const pendentes = notas.filter((n) => n.franquia_id === u.id && n.status === 'pendente').length;
    return { ...u, receita: r, despesa: d, resultado: r - d, pendentes };
  });

  const abrirUnidade = (id: string) => {
    setViewAsId(id);
    navigate('/dashboard');
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Building2} label="Unidades ativas" value={String(unidades.filter((u) => u.ativo).length)} />
        <StatCard icon={TrendingUp} label="Receita da rede" value={formatCurrency(receita)} tone="success" />
        <StatCard icon={TrendingDown} label="Despesa da rede" value={formatCurrency(despesa)} tone="destructive" />
        <StatCard icon={FileText} label="Notas pendentes" value={String(notasPendentes)} />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/40"><p className="font-semibold">Por unidade</p></div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Receita</TableHead>
              <TableHead className="text-right">Despesa</TableHead>
              <TableHead className="text-right">Resultado</TableHead>
              <TableHead className="text-right">Notas pendentes</TableHead>
              <TableHead className="text-right">Operação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {porUnidade.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma unidade cadastrada ainda.</TableCell></TableRow>
            )}
            {porUnidade.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell><Badge variant={u.ativo ? 'default' : 'outline'}>{u.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                <TableCell className="text-right text-success">{formatCurrency(u.receita)}</TableCell>
                <TableCell className="text-right text-destructive">{formatCurrency(u.despesa)}</TableCell>
                <TableCell className={`text-right font-semibold ${u.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(u.resultado)}</TableCell>
                <TableCell className="text-right">{u.pendentes > 0 ? <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">{u.pendentes}</Badge> : '—'}</TableCell>
                <TableCell className="text-right"><Button variant="outline" size="sm" onClick={() => abrirUnidade(u.id)}>Abrir unidade <ArrowRight className="ml-1 h-3.5 w-3.5" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

export default function Dashboard({ escopo }: { escopo: 'rede' | 'unidade' }) {
  const { user } = useAuth();
  const { franquiaEfetiva, unidades, viewAsId } = useViewAs();
  const unidadeAtual = unidades.find((u) => u.id === viewAsId);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold">
        {escopo === 'rede' ? 'Dashboard — Rede IDM PSI' : user?.role === 'franqueador'
          ? `Dashboard — ${unidadeAtual?.nome ?? 'Unidade'}` : 'Dashboard — Minha Unidade'}
      </h1>
      {escopo === 'rede' ? <ResumoRede /> : franquiaEfetiva ? <ResumoUnidade franquiaId={franquiaEfetiva} /> : null}
    </div>
  );
}
