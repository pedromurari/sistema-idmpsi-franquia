import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Building2, Network } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { FeedbackBox } from './FeedbackBox';
import { navGroups, rotaFranqueadora } from './navGroups';

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { unidades, viewAsId } = useViewAs();
  const location = useLocation();
  if (!user) return null;
  const unidadeAtual = unidades.find((unidade) => unidade.id === viewAsId);
  const areaCentral = user.role === 'franqueador' && rotaFranqueadora(location.pathname);
  const nomeArea = areaCentral ? 'Franqueadora · rede' : user.role === 'franqueado' ? 'Minha unidade' : `Operação · ${unidadeAtual?.nome ?? 'unidade'}`;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <nav aria-label="Navegação móvel" className="lg:hidden flex gap-2 overflow-x-auto border-b p-2 text-sm">
        {navGroups(user.role, unidadeAtual?.nome).map((grupo) => <div key={grupo.titulo} className="flex items-center gap-2 shrink-0 border-r pr-2 last:border-r-0">
          <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">{grupo.titulo}</span>
          {grupo.itens.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `px-3 py-2 rounded whitespace-nowrap ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}>{item.label}</NavLink>)}
        </div>)}
      </nav>
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto p-4 lg:p-6">
          <div aria-label="Área atual" className="mb-5 flex items-center gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary">
            {areaCentral ? <Network className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}{nomeArea}
          </div>
          {children}
          <FeedbackBox />
        </main>
      </div>
    </div>
  );
}
