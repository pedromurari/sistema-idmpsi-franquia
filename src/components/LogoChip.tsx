import { useState } from 'react';
import { cn } from '@/lib/utils';

// A marca da franquia é branca/prateada, feita pra fundo escuro -- não dá pra
// jogar direto no header, que muda de claro pra escuro com o tema. Por isso a
// "placa" escura fixa (sempre neutral-900, independente do tema do resto da
// página) em volta da logo, só nela.
export function LogoChip({ className }: { className?: string }) {
  const [falhou, setFalhou] = useState(false);

  if (falhou) {
    return <p className="font-bold leading-tight">IDM PSI</p>;
  }

  return (
    <div className={cn('bg-neutral-900 rounded-md px-3 flex items-center', className)}>
      <img src="/logo.webp" alt="IDM PSI — Desperta sua mente" className="h-full w-auto object-contain" onError={() => setFalhou(true)} />
    </div>
  );
}
