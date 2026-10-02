import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { LayoutDashboard, Building2, Calculator, FileText, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';

// Mesmo padrão visual do CRM interno (src/components/crm/Sidebar.tsx): barra
// branca fixa à esquerda, item ativo em bg-primary/8 + text-primary, botão de
// recolher flutuando na borda. Sem drag-reorder/grupos aqui de propósito --
// são só 4 itens, não precisa da complexidade toda do CRM interno.
export function Sidebar() {
  const { user } = useAuth();
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

  const itens = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(user?.role === 'franqueador' ? [{ to: '/unidades', label: 'Unidades', icon: Building2 }] : []),
    { to: '/turmas', label: 'Turmas', icon: GraduationCap },
    { to: '/dre', label: 'Financeiro', icon: Calculator },
    { to: '/notas', label: 'Notas Fiscais', icon: FileText },
  ];

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
        {itens.map((item) => (
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
        ))}
      </nav>
    </aside>
  );
}
