import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Building2, TrendingUp, TrendingDown, FileText } from 'lucide-react';

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

interface Lancamento { franquia_id: string; tipo: 'receita' | 'despesa'; valor: number; }
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

export default function Dashboard() {
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [notas, setNotas] = useState<NotaStatus[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const carregar = async () => {
      const [{ data: dre, error: dreErr }, { data: nf, error: nfErr }, { data: un, error: unErr }] = await Promise.all([
        supabase.from('franquia_dre_lancamentos').select('franquia_id, tipo, valor'),
        supabase.from('franquia_notas_fiscais').select('franquia_id, status'),
        user?.role === 'franqueador'
          ? supabase.from('franquias').select('id, nome, ativo')
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (dreErr) console.error('Erro ao carregar DRE:', dreErr);
      if (nfErr) console.error('Erro ao carregar notas:', nfErr);
      if (unErr) console.error('Erro ao carregar unidades:', unErr);
      setLancamentos((dre as Lancamento[]) ?? []);
      setNotas((nf as NotaStatus[]) ?? []);
      setUnidades((un as Unidade[]) ?? []);
      setLoading(false);
    };
    carregar();
  }, [user?.role]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const receita = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
  const despesa = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
  const notasPendentes = notas.filter((n) => n.status === 'pendente').length;

  // Visão do franqueador: rede inteira + abertura por unidade.
  if (user?.role === 'franqueador') {
    const porUnidade = unidades.map((u) => {
      const doUnidade = lancamentos.filter((l) => l.franquia_id === u.id);
      const r = doUnidade.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
      const d = doUnidade.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);
      const pendentes = notas.filter((n) => n.franquia_id === u.id && n.status === 'pendente').length;
      return { ...u, receita: r, despesa: d, resultado: r - d, pendentes };
    });

    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-lg font-bold">Dashboard — Rede IDM PSI</h1>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {porUnidade.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma unidade cadastrada ainda.</TableCell></TableRow>
              )}
              {porUnidade.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    <Link to={`/dre?franquia=${u.id}`} className="hover:underline">{u.nome}</Link>
                  </TableCell>
                  <TableCell><Badge variant={u.ativo ? 'default' : 'outline'}>{u.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                  <TableCell className="text-right text-success">{formatCurrency(u.receita)}</TableCell>
                  <TableCell className="text-right text-destructive">{formatCurrency(u.despesa)}</TableCell>
                  <TableCell className={`text-right font-semibold ${u.resultado >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(u.resultado)}</TableCell>
                  <TableCell className="text-right">{u.pendentes > 0 ? <Badge variant="outline" className="bg-warning/15 text-warning border-warning/30">{u.pendentes}</Badge> : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    );
  }

  // Visão do franqueado: resumo só da própria unidade (RLS já garante isso --
  // as queries acima nem levaram franquia_id, retornam só o que a policy libera).
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-bold">Dashboard — Minha Unidade</h1>
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
