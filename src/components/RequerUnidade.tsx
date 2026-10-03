import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';

// Antes, as telas que exigem uma unidade escolhida (Turmas, Financeiro,
// Notas) só devolviam <Navigate to="/unidades" /> em silêncio quando o
// franqueador ainda não tinha escolhido nenhuma no "Ver como" -- parecia
// que o link "não funcionava" (achado real, Pedro 2026-10-02). Agora avisa
// por quê antes de voltar pra Unidades.
export function RequerUnidade() {
  useEffect(() => {
    toast.info('Escolha uma unidade na lista para abrir essa área.');
  }, []);
  return <Navigate to="/unidades" replace />;
}
