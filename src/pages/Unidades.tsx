import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useViewAs } from '@/contexts/ViewAsContext';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, Eye } from 'lucide-react';

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
  const { setViewAsId } = useViewAs();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('franquias')
      .select('id, nome, cidade, estado, ativo')
      .order('nome')
      .then(({ data, error }) => {
        if (error) console.error('Erro ao carregar unidades:', error);
        setUnidades((data as Unidade[]) ?? []);
        setLoading(false);
      });
  }, []);

  const verComo = (id: string) => {
    setViewAsId(id);
    navigate('/dashboard');
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-bold">Unidades</h1>
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
              <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhuma unidade cadastrada ainda.</TableCell></TableRow>
            )}
            {unidades.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nome}</TableCell>
                <TableCell>{[u.cidade, u.estado].filter(Boolean).join(' - ') || '—'}</TableCell>
                <TableCell><Badge variant={u.ativo ? 'default' : 'outline'}>{u.ativo ? 'Ativa' : 'Inativa'}</Badge></TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => verComo(u.id)} className="gap-1.5">
                    <Eye className="h-3.5 w-3.5" /> Ver como
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
