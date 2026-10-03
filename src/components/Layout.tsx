import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { FeedbackBox } from './FeedbackBox';
import { navGroups } from './navGroups';

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <nav aria-label="Navegação móvel" className="lg:hidden flex gap-2 overflow-x-auto border-b p-2 text-sm">
        {navGroups(user.role).map((grupo) => <div key={grupo.titulo} className="flex items-center gap-2 shrink-0 border-r pr-2 last:border-r-0">
          <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">{grupo.titulo}</span>
          {grupo.itens.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `px-3 py-2 rounded whitespace-nowrap ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}>{item.label}</NavLink>)}
        </div>)}
      </nav>
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto p-4 lg:p-6">{children}<FeedbackBox /></main>
      </div>
    </div>
  );
}
