import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { LogoChip } from '@/components/LogoChip';
import { LogOut, Sun, Moon } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <header className="h-16 bg-card border-b border-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        <LogoChip className="h-9" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:block">Portal do Franqueado</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium leading-tight">{user?.nome}</p>
          <p className="text-xs text-muted-foreground leading-tight">{user?.role === 'franqueador' ? 'Franqueador' : 'Franqueado'}</p>
        </div>
        <Button variant="ghost" size="icon" onClick={toggle} title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" onClick={logout} title="Sair">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
