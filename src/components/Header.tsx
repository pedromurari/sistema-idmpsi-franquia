import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useViewAs } from '@/contexts/ViewAsContext';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LogoChip } from '@/components/LogoChip';
import { LogOut, Sun, Moon, Building2 } from 'lucide-react';
import { rotaFranqueadora } from './navGroups';

const VISAO_GERAL = '__geral__';

export function Header() {
  const { user, logout } = useAuth();
  const { unidades, viewAsId, setViewAsId } = useViewAs();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const areaSelecionada = rotaFranqueadora(location.pathname) ? VISAO_GERAL : viewAsId ?? VISAO_GERAL;

  return (
    <header className="min-h-16 py-2 bg-card border-b border-border px-4 lg:px-6 flex flex-wrap gap-2 items-center justify-between sticky top-0 z-40 shadow-sm">
      <div className="flex items-center gap-3">
        <LogoChip className="h-9" />
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground hidden sm:block">{user?.role === 'franqueador' ? 'Central da franqueadora' : 'Portal da unidade'}</p>
      </div>

      <div className="flex items-center gap-3">
        {user?.role === 'franqueador' && (
          <div className="flex items-center gap-1.5">
            <Building2 className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
            <Select
              value={areaSelecionada}
              onValueChange={(v) => {
                setViewAsId(v === VISAO_GERAL ? null : v);
                navigate(v === VISAO_GERAL ? '/rede' : '/dashboard');
              }}
            >
              <SelectTrigger aria-label="Área de trabalho" className="h-8 text-xs w-[200px] bg-background">
                <SelectValue placeholder="Área de trabalho" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-[100]">
                <SelectItem value={VISAO_GERAL} className="text-xs font-semibold">Franqueadora · rede</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id} className="text-xs">{u.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
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
