import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <nav aria-label="Navegação móvel" className="lg:hidden flex gap-2 overflow-x-auto border-b p-2 text-sm">
        {[
          { to: '/dashboard', label: 'Dashboard' },
          ...(user.role === 'franqueador' ? [{ to: '/unidades', label: 'Unidades' }] : []),
          { to: '/turmas', label: 'Turmas' },
          { to: '/comercial', label: 'Comercial' },
          ...(user.role === 'franqueador' ? [{ to: '/expansao', label: 'IDM PSI Franquias' }] : []),
          { to: '/dre', label: 'Financeiro' },
          { to: '/notas', label: 'Notas' },
        ].map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => `px-3 py-2 rounded whitespace-nowrap ${isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground'}`}>{item.label}</NavLink>)}
      </nav>
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
