import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface NotaFiscal {
  id: string;
  numero: string | null;
  valor: number;
  status: 'pendente' | 'emitida' | 'cancelada';
  competencia: string;
  data_emissao: string | null;
  link_pdf: string | null;
}

const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const STATUS_BADGE: Record<NotaFiscal['status'], { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-warning/15 text-warning border-warning/30' },
  emitida: { label: 'Emitida', className: 'bg-success/15 text-success border-success/30' },
  cancelada: { label: 'Cancelada', className: 'bg-destructive/15 text-destructive border-destructive/30' },
};

export default function NotasFiscais() {
  const { user } = useAuth();
  // franqueado sempre vê a própria unidade; franqueador vê a que escolheu no
  // seletor "ver como" do header (useViewAs) -- nunca pela URL.
  const { franquiaEfetiva: franquiaId } = useViewAs();

  const [notas, setNotas] = useState<NotaFiscal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [valor, setValor] = useState('');
  const [competencia, setCompetencia] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    if (!franquiaId) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('franquia_notas_fiscais')
      .select('id, numero, valor, status, competencia, data_emissao, link_pdf')
      .eq('franquia_id', franquiaId)
      .order('competencia', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('Erro ao carregar notas:', error);
        setNotas((data as NotaFiscal[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(carregar, [franquiaId]);

  const solicitar = async () => {
    if (!franquiaId || !valor || !competencia) return;
    setSalvando(true);
    const { error } = await supabase.from('franquia_notas_fiscais').insert({
      franquia_id: franquiaId,
      valor: Number(valor.replace(',', '.')),
      competencia: `${competencia}-01`,
      status: 'pendente',
    });
    setSalvando(false);
    if (error) { toast.error('Não foi possível solicitar a nota: ' + error.message); return; }
    toast.success('Solicitação enviada! A franqueadora vai processar a emissão.');
    setValor('');
    setCompetencia('');
    setDialogAberto(false);
    carregar();
  };

  if (user?.role === 'franqueador' && !franquiaId) {
    return <Navigate to="/unidades" replace />;
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Notas Fiscais</h1>
        {franquiaId && (
          <Button size="sm" onClick={() => setDialogAberto(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Solicitar nota
          </Button>
        )}
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Competência</TableHead>
              <TableHead>Número</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Emitida em</TableHead>
              <TableHead>PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notas.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma nota registrada ainda.</TableCell></TableRow>
            )}
            {notas.map((n) => (
              <TableRow key={n.id}>
                <TableCell className="capitalize">{new Date(n.competencia + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</TableCell>
                <TableCell>{n.numero ?? '—'}</TableCell>
                <TableCell>{formatCurrency(Number(n.valor))}</TableCell>
                <TableCell><Badge variant="outline" className={STATUS_BADGE[n.status].className}>{STATUS_BADGE[n.status].label}</Badge></TableCell>
                <TableCell>{n.data_emissao ? new Date(n.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR') : '—'}</TableCell>
                <TableCell>{n.link_pdf ? <a href={n.link_pdf} target="_blank" rel="noopener noreferrer" className="text-primary underline">Baixar</a> : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Solicitar nota fiscal</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="nf-competencia">Competência</Label>
              <Input id="nf-competencia" type="month" value={competencia} onChange={(e) => setCompetencia(e.target.value)} disabled={salvando} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nf-valor">Valor</Label>
              <Input id="nf-valor" inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} disabled={salvando} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={salvando}>Cancelar</Button>
            <Button onClick={solicitar} disabled={salvando || !valor || !competencia}>{salvando ? 'Enviando...' : 'Solicitar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
