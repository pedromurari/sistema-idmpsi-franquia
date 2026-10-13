import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, KeyRound, LogOut, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function ProfileMenu() {
  const { user, logout, mfaStatus } = useAuth();
  const [abaSenha, setAbaSenha] = useState(false);
  const [aba2fa, setAba2fa] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-accent text-left">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-tight">{user?.nome}</p>
              <p className="text-xs text-muted-foreground leading-tight">{user?.role === 'franqueador' ? 'Franqueador' : 'Franqueado'}</p>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="sm:hidden">{user?.nome}</DropdownMenuLabel>
          <DropdownMenuSeparator className="sm:hidden" />
          <DropdownMenuItem onClick={() => setAbaSenha(true)}>
            <KeyRound className="h-4 w-4 mr-2" /> Trocar senha
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAba2fa(true)}>
            <ShieldCheck className="h-4 w-4 mr-2" /> Verificação em duas etapas
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive">
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TrocarSenhaDialog open={abaSenha} onOpenChange={setAbaSenha} />
      <Gerenciar2faDialog open={aba2fa} onOpenChange={setAba2fa} mfaStatus={mfaStatus} />
    </>
  );
}

function TrocarSenhaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { if (!open) { setNovaSenha(''); setConfirmacao(''); } }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novaSenha.length < 8) { toast.error('A senha precisa ter pelo menos 8 caracteres.'); return; }
    if (novaSenha !== confirmacao) { toast.error('As senhas não coincidem.'); return; }
    setEnviando(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setEnviando(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Senha atualizada.');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Trocar senha</DialogTitle>
          <DialogDescription>Você já está logado — não precisa confirmar a senha atual.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nova-senha">Nova senha</Label>
            <Input id="nova-senha" type="password" required minLength={8} autoComplete="new-password"
              value={novaSenha} onChange={(e) => setNovaSenha(e.target.value)} disabled={enviando} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmacao-senha">Confirmar nova senha</Label>
            <Input id="confirmacao-senha" type="password" required minLength={8} autoComplete="new-password"
              value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)} disabled={enviando} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={enviando}>
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar nova senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Gerenciar2faDialog({ open, onOpenChange, mfaStatus }: { open: boolean; onOpenChange: (v: boolean) => void; mfaStatus: string }) {
  const { refreshMfaStatus } = useAuth();
  const [trocando, setTrocando] = useState(false);

  // Trocar de aparelho: remove o fator verificado atual. O ProtectedRoute
  // detecta mfaStatus voltando pra 'enroll' e mostra o MfaGate de novo --
  // mesma tela de cadastro do primeiro login, sem duplicar UI de QR code aqui.
  const handleTrocarAparelho = async () => {
    setTrocando(true);
    const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
    const fatorAtual = factors?.totp[0];
    if (listError || !fatorAtual) { toast.error('Não encontrei o fator atual.'); setTrocando(false); return; }
    const { error } = await supabase.auth.mfa.unenroll({ factorId: fatorAtual.id });
    setTrocando(false);
    if (error) { toast.error(error.message); return; }
    onOpenChange(false);
    await refreshMfaStatus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Verificação em duas etapas</DialogTitle>
          <DialogDescription>
            {mfaStatus === 'satisfied'
              ? 'Ativa nesta conta. Obrigatória neste portal — protege o dado fiscal e financeiro da sua unidade.'
              : 'Ainda não configurada nesta conta.'}
          </DialogDescription>
        </DialogHeader>
        <Button variant="outline" onClick={handleTrocarAparelho} disabled={trocando}>
          {trocando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
          Trocar de aparelho / reconfigurar
        </Button>
        <p className="text-xs text-muted-foreground">
          Use se perdeu o celular com o app autenticador ou quer trocar de aparelho.
          Você vai ser levado pra tela de cadastro de um novo código na hora.
        </p>
      </DialogContent>
    </Dialog>
  );
}
