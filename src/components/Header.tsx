import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { LogOut, Sun, Moon } from 'lucide-react';

export function Header() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  // Logo da franquia ainda não recebido -- quando chegar, salvar em
  // public/logo.png (o <img> abaixo já aponta pra lá e se auto-esconde se faltar).
  const [logoFalhou, setLogoFalhou] = useState(false);

  return (
    <header className="h-16 bg-card border-b border-border px-4 lg:px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-2">
        {!logoFalhou && (
          <img src="/logo.png" alt="IDM PSI" className="h-8 w-8 object-contain" onError={() => setLogoFalhou(true)} />
        )}
        <div>
          <p className="font-bold leading-tight">Portal do Franqueado</p>
          <p className="text-xs text-muted-foreground leading-tight">Franquia IDM PSI</p>
        </div>
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
