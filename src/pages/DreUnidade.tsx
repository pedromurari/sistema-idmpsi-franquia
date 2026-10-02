import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Loader2 } from 'lucide-react';

interface Lancamento {
  id: string;
  competencia: string;
  tipo: 'receita' | 'despesa';
  categoria: string;
  descricao: string | null;
  valor: number;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const formatMes = (competencia: string) =>
  new Date(competencia + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

export default function DreUnidade() {
  const { user } = useAuth();
  // franqueado sempre vê a própria unidade; franqueador vê a que escolheu no
  // seletor "ver como" do header (useViewAs) -- nunca pela URL.
  const { franquiaEfetiva } = useViewAs();

  const [lancamentos, setLancamentos] = useState<Lancamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!franquiaEfetiva) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('franquia_dre_lancamentos')
      .select('id, competencia, tipo, categoria, descricao, valor')
      .eq('franquia_id', franquiaEfetiva)
      .order('competencia', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Erro ao carregar DRE:', error);
        setLancamentos((data as Lancamento[]) ?? []);
        setLoading(false);
      });
  }, [franquiaEfetiva]);

  if (user?.role === 'franqueador' && !franquiaEfetiva) {
    return <Navigate to="/unidades" replace />;
  }

  const porMes = lancamentos.reduce<Record<string, Lancamento[]>>((acc, l) => {
    (acc[l.competencia] ??= []).push(l);
    return acc;
  }, {});

  const totalReceita = lancamentos.filter((l) => l.tipo === 'receita').reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesa = lancamentos.filter((l) => l.tipo === 'despesa').reduce((s, l) => s + Number(l.valor), 0);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Receita total</p>
          <p className="text-2xl font-bold text-success">{formatCurrency(totalReceita)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Despesa total</p>
          <p className="text-2xl font-bold text-destructive">{formatCurrency(totalDespesa)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Resultado</p>
          <p className={`text-2xl font-bold ${totalReceita - totalDespesa >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(totalReceita - totalDespesa)}
          </p>
        </Card>
      </div>

      {Object.keys(porMes).length === 0 && (
        <Card className="p-8 text-center text-muted-foreground">Nenhum lançamento registrado ainda pra essa unidade.</Card>
      )}

      {Object.entries(porMes).map(([competencia, itens]) => {
        const receita = itens.filter((i) => i.tipo === 'receita').reduce((s, i) => s + Number(i.valor), 0);
        const despesa = itens.filter((i) => i.tipo === 'despesa').reduce((s, i) => s + Number(i.valor), 0);
        return (
          <Card key={competencia} className="p-0 overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/40 flex items-center justify-between">
              <p className="font-semibold capitalize">{formatMes(competencia)}</p>
              <p className="text-sm text-muted-foreground">Resultado: <span className={receita - despesa >= 0 ? 'text-success font-semibold' : 'text-destructive font-semibold'}>{formatCurrency(receita - despesa)}</span></p>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell>
                      <span className={l.tipo === 'receita' ? 'text-success' : 'text-destructive'}>
                        {l.tipo === 'receita' ? 'Receita' : 'Despesa'}
                      </span>
                    </TableCell>
                    <TableCell>{l.categoria}</TableCell>
                    <TableCell className="text-muted-foreground">{l.descricao ?? '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(l.valor))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3}>Receita</TableCell>
                  <TableCell className="text-right">{formatCurrency(receita)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3}>Despesa</TableCell>
                  <TableCell className="text-right">{formatCurrency(despesa)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </Card>
        );
      })}
    </div>
  );
}
