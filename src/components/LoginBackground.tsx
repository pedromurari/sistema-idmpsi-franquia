// Fundo decorativo da tela de login -- ícones em line-art bem discretos
// (opacidade baixa), relacionados à psicanálise: perfil de busto clássico
// (referência ao Freud, sem ser um retrato literal), divã, espiral (o mesmo
// motivo do símbolo da marca) e um livro aberto. Decoração pura, nunca o
// foco da tela -- por isso pointer-events-none e z-index atrás do form.
const ICONES = [
  // Perfil de busto clássico (estilo "ícone de pensador/psicanalista")
  <path key="busto" d="M40 10c-9 0-16 7-16 16 0 5 2 9 5 12-7 2-13 8-13 16v6h48v-6c0-8-6-14-13-16 3-3 5-7 5-12 0-9-7-16-16-16zm0 4c7 0 12 5 12 12 0 4-2 7-4 9-1-1-2-2-4-2-1 0-2 1-2 2h-4c0-1-1-2-2-2-2 0-3 1-4 2-2-2-4-5-4-9 0-7 5-12 12-12z" />,
  // Divã de psicanalista (silhueta simples)
  <path key="diva" d="M4 40h4v-8c0-3 2-5 5-5h54c3 0 5 2 5 5v8h4v6H4v-6zm10-10c-1 0-2 1-2 2v2h56v-2c0-1-1-2-2-2H14z" />,
  // Espiral -- mesmo motivo do símbolo da marca
  <path key="espiral" d="M40 10a30 30 0 1 0 21 51 24 24 0 1 1-15-41 18 18 0 1 1-9 31 12 12 0 1 0 5-21" fill="none" strokeWidth="3" stroke="currentColor" />,
  // Livro aberto
  <path key="livro" d="M6 14c10-4 20-2 26 4v38c-6-5-16-7-26-4V14zm68 0c-10-4-20-2-26 4v38c6-5 16-7 26-4V14z" />,
];

function Icone({ index, className }: { index: number; className: string }) {
  const conteudo = ICONES[index % ICONES.length];
  const temStroke = index % ICONES.length === 2; // espiral usa stroke, não fill
  return (
    <svg viewBox="0 0 80 80" className={className} fill={temStroke ? 'none' : 'currentColor'}>
      {conteudo}
    </svg>
  );
}

export function LoginBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">
      <div className="absolute inset-0 bg-neutral-950" />
      <div className="absolute inset-0 text-white/[0.05] animate-drift">
        <Icone index={0} className="absolute top-[8%] left-[6%] h-40 w-40 lg:h-56 lg:w-56" />
        <Icone index={1} className="absolute bottom-[10%] left-[18%] h-32 w-32 lg:h-44 lg:w-44" />
        <Icone index={2} className="absolute top-[18%] right-[10%] h-48 w-48 lg:h-64 lg:w-64" />
        <Icone index={3} className="absolute bottom-[14%] right-[20%] h-28 w-28 lg:h-36 lg:w-36" />
        <Icone index={0} className="absolute top-[55%] left-[45%] h-24 w-24 lg:h-32 lg:w-32 opacity-70" />
      </div>
      {/* Vinheta sutil pra garantir contraste no centro, onde fica o form */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.55)_75%)]" />
    </div>
  );
}
