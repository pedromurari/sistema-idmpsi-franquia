import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, Building2, FileText, LayoutDashboard } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  if (!user) return null;

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
      isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
    );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card">
        <div className="container flex items-center justify-between py-3">
          <div>
            <p className="font-bold leading-tight">Portal do Franqueado</p>
            <p className="text-xs text-muted-foreground">Franquia IDM PSI</p>
          </div>
          <nav className="flex items-center gap-1">
            {user.role === 'franqueador' && (
              <NavLink to="/unidades" className={linkClass}>
                <Building2 className="h-4 w-4" /> Unidades
              </NavLink>
            )}
            <NavLink to="/dre" className={linkClass} end>
              <LayoutDashboard className="h-4 w-4" /> DRE
            </NavLink>
            <NavLink to="/notas" className={linkClass}>
              <FileText className="h-4 w-4" /> Notas Fiscais
            </NavLink>
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium leading-tight">{user.nome}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user.role === 'franqueador' ? 'Franqueador' : 'Franqueado'}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={logout} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="container flex-1 py-6">{children}</main>
    </div>
  );
}
