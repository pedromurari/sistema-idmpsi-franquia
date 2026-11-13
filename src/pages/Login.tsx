import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LoginBackground } from '@/components/LoginBackground';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

// Tela de marca -- sempre escura, não segue o tema claro/escuro do resto do
// app (esse só existe depois que a pessoa loga). Por isso as cores aqui são
// fixas (neutral-900, white) em vez dos tokens --card/--foreground.
export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    const r = await login(email, senha);
    setEnviando(false);
    if (!r.success) toast.error(r.error || 'Não foi possível entrar.');
  };

  const recuperarSenha = async () => {
    if (!email.trim()) return toast.error('Escreva seu e-mail acima primeiro.');
    setEnviando(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/redefinir-senha`,
    });
    setEnviando(false);
    // Resposta igual com e sem cadastro, de propósito: dizer "esse e-mail não
    // existe" entregaria pra qualquer um quem tem acesso ao portal.
    if (error) return toast.error(error.message);
    toast.success('Se esse e-mail tiver acesso, o link de redefinição chega em instantes. Confira o spam.');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <LoginBackground />
      <Card className="w-full max-w-sm p-6 relative bg-neutral-900 border-neutral-800 text-white">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/logo.webp" alt="IDM PSI — Desperta sua mente" className="h-14 w-auto object-contain" />
          <p className="text-sm text-neutral-400">Portal do Franqueado</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-neutral-300">E-mail</Label>
            <Input
              id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={enviando} autoComplete="email"
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="senha" className="text-neutral-300">Senha</Label>
            <Input
              id="senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
              disabled={enviando} autoComplete="current-password"
              className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
            />
          </div>
          <Button
            type="submit"
            disabled={enviando}
            className="mt-2 bg-[#f8b400] hover:bg-[#e0a300] text-neutral-900 font-semibold"
          >
            {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Entrar'}
          </Button>
          <button
            type="button" onClick={() => void recuperarSenha()} disabled={enviando}
            className="text-xs text-neutral-400 hover:text-neutral-200 underline-offset-2 hover:underline disabled:opacity-50"
          >
            Esqueci minha senha
          </button>
        </form>
      </Card>
    </div>
  );
}
