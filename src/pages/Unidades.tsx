import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useViewAs } from '@/contexts/ViewAsContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Unidade {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  ativo: boolean;
}

// Visão exclusiva do franqueador -- lista todas as unidades (a RLS já garante
// isso; a tela não precisa filtrar nada, só existe policy de select pra quem
// é franqueador ou pra ver a própria, e aqui a query não passa franquia_id
// nenhum, então só retorna linha se a policy liberar).
export default function Unidades() {
  const navigate = useNavigate();
  const { setViewAsId, recarregarUnidades } = useViewAs();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = () => {
    setLoading(true);
    supabase
      .from('franquias')
      .select('id, nome, cidade, estado, ativo')
      .order('nome')
      .then(({ data, error }) => {
        if (error) console.error('Erro ao carregar unidades:', error);
        setUnidades((data as Unidade[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(carregar, []);

  const abrirUnidade = (id: string) => {
    setViewAsId(id);
    navigate('/dashboard');
  };

  const criar = async () => {
    if (!nome.trim()) return;
    setSalvando(true);
    const { error } = await supabase.from('franquias').insert({
      nome: nome.trim(),
      cidade: cidade.trim() || null,
      estado: estado.trim() || null,
    });
    setSalvando(false);
    if (error) { toast.error('Não foi possível criar a unidade: ' + error.message); return; }
    toast.success('Unidade criada!');
    setNome('');
    setCidade('');
    setEstado('');
    setDialogAberto(false);
    carregar();
    void recarregarUnidades();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Unidades</h1>
        <Button size="sm" onClick={() => setDialogAberto(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova unidade
        </Button>
      </div>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidade</TableHead>
              <TableHead>Cidade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unidades.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma unidade cadastrada ainda. Clica em "Nova unidade" pra criar a primeira.</TableCell></TableRow>
            )}
            {unidades.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{[u.cidade, u.estado].filter(Boolean).join(' - ') || '—'}</TableCell>
                <TableCell><Badge variant={u.ativo ? 'default' : 'outline'}>{u.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => abrirUnidade(u.id)} className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Abrir operação
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nova unidade</DialogTitle></DialogHeader>
          <div className="flex flex-col gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="un-nome">Nome da unidade</Label>
              <Input id="un-nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: IDM PSI Curitiba" disabled={salvando} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="un-cidade">Cidade</Label>
              <Input id="un-cidade" value={cidade} onChange={(e) => setCidade(e.target.value)} disabled={salvando} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="un-estado">Estado (UF)</Label>
              <Input id="un-estado" value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase())} maxLength={2} placeholder="PR" disabled={salvando} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogAberto(false)} disabled={salvando}>Cancelar</Button>
            <Button onClick={criar} disabled={salvando || !nome.trim()}>{salvando ? 'Salvando...' : 'Criar unidade'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
