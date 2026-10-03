import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { navGroups } from './navGroups';

export function Sidebar() {
  const { user } = useAuth();
  const { unidades, viewAsId } = useViewAs();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('franqueadora-sidebar-collapsed') === 'true'; } catch { return false; }
  });

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem('franqueadora-sidebar-collapsed', String(next)); } catch { /* ignora */ }
      return next;
    });
  };

  const unidadeAtual = unidades.find((unidade) => unidade.id === viewAsId);
  const grupos = navGroups(user?.role ?? 'franqueado', unidadeAtual?.nome);

  return (
    <aside
      className={cn(
        'bg-card border-r border-border min-h-[calc(100vh-4rem)] hidden lg:flex flex-col overflow-y-auto transition-all duration-300 relative flex-shrink-0',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <button
        onClick={toggle}
        className="absolute -right-3 top-4 z-10 bg-card border border-border rounded-full p-0.5 shadow-sm hover:bg-primary/5 hover:border-primary transition-colors"
        title={collapsed ? 'Expandir menu' : 'Minimizar menu'}
      >
        {collapsed ? <ChevronRight className="h-3.5 w-3.5 text-foreground/60" /> : <ChevronLeft className="h-3.5 w-3.5 text-foreground/60" />}
      </button>

      <nav className={cn('space-y-0.5 flex-1 pt-4', collapsed ? 'px-2' : 'px-3')}>
        {grupos.map((grupo, index) => <div key={grupo.titulo} className={index ? 'mt-4 border-t pt-4' : ''}>
          {!collapsed && <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{grupo.titulo}</p>}
          {collapsed && <span className="sr-only">{grupo.titulo}</span>}
          <div className="space-y-0.5">{grupo.itens.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'w-full flex items-center rounded transition-all duration-300 text-left text-sm font-semibold',
                collapsed ? 'justify-center px-2 py-2.5' : 'gap-2.5 px-3 py-2.5',
                isActive ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-primary/5 hover:text-primary'
              )
            }
          >
            <item.icon className="h-4.5 w-4.5 flex-shrink-0" />
            {!collapsed && <span className="flex-1">{item.label}</span>}
          </NavLink>
        ))}</div></div>)}
        {user?.role === 'franqueador' && !viewAsId && !collapsed && <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 text-xs">
          <p className="font-semibold">Operação de uma unidade</p>
          <p className="mt-1 text-muted-foreground">Escolha uma unidade para abrir Turmas, Comercial, Financeiro e Social mídia local.</p>
          <NavLink to="/unidades" className="mt-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline"><Building2 className="h-3.5 w-3.5" /> Escolher unidade</NavLink>
        </div>}
      </nav>
    </aside>
  );
}
