import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LoginBackground } from '@/components/LoginBackground';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type Estado = 'verificando' | 'pronto' | 'invalido';

// Recebe quem veio do e-mail de recuperação. Fica FORA do ProtectedRoute de
// propósito: a sessão do link é aal1 e o portal exige 2FA (aal2), então passar
// por aqui dentro da área protegida jogaria a pessoa no MfaGate antes de ela
// conseguir definir a senha -- ou seja, nunca sairia do lugar.
export default function RedefinirSenha() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>('verificando');
  const [motivo, setMotivo] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmacao, setConfirmacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const preparar = async () => {
      const params = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

      // O Supabase devolve o erro no próprio link quando o token já foi usado
      // ou venceu -- sem tratar isso, a pessoa só via a tela de login de novo
      // e não entendia o motivo.
      const erro = params.get('error_description') ?? hash.get('error_description') ?? params.get('error') ?? hash.get('error');
      if (erro) {
        if (!ativo) return;
        setMotivo(/expired|invalid/i.test(erro)
          ? 'Este link de redefinição venceu ou já foi usado.'
          : decodeURIComponent(erro));
        setEstado('invalido');
        return;
      }

      // Formato novo (token_hash na URL): a própria página troca o token por
      // uma sessão. É o caminho que o nosso modelo de e-mail usa.
      const tokenHash = params.get('token_hash');
      if (tokenHash) {
        // O convite de franqueado novo chega com type=invite e o "esqueci
        // minha senha" com type=recovery -- as duas caem nesta mesma tela.
        // Lista fechada de propósito: o type vem da URL, então aceitar
        // qualquer valor deixaria a pessoa escolher o tipo de token a validar.
        const tipoUrl = params.get('type');
        const tipo = tipoUrl === 'invite' ? 'invite' : 'recovery';
        const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash });
        if (!ativo) return;
        if (error) {
          setMotivo('Este link de redefinição venceu ou já foi usado.');
          setEstado('invalido');
          return;
        }
        setEstado('pronto');
        return;
      }

      // Formato antigo (token no #): o supabase-js já consumiu o link sozinho
      // ao carregar a página, então basta confirmar que a sessão existe.
      const { data } = await supabase.auth.getSession();
      if (!ativo) return;
      if (data.session) { setEstado('pronto'); return; }
      setMotivo('Abra o link mais recente que você recebeu por e-mail.');
      setEstado('invalido');
    };
    void preparar();
    return () => { ativo = false; };
  }, []);

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando) return;
    if (senha.length < 8) return toast.error('A senha precisa ter pelo menos 8 caracteres.');
    if (senha !== confirmacao) return toast.error('As duas senhas não são iguais.');
    setSalvando(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvando(false);
    if (error) return toast.error(error.message);
    // Sai da sessão de recuperação pra pessoa entrar pelo caminho normal e
    // cair no 2FA já autenticada com a senha nova.
    await supabase.auth.signOut();
    toast.success('Senha definida. Entre com ela agora.');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <LoginBackground />
      <Card className="w-full max-w-sm p-6 relative bg-neutral-900 border-neutral-800 text-white">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img src="/logo.webp" alt="IDM PSI — Desperta sua mente" className="h-14 w-auto object-contain" />
          <p className="text-sm text-neutral-400">Definir nova senha</p>
        </div>

        {estado === 'verificando' && (
          <div className="flex justify-center py-6"><Loader2 aria-label="Verificando link" className="h-5 w-5 animate-spin text-neutral-400" /></div>
        )}

        {estado === 'invalido' && (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-neutral-300">{motivo}</p>
            <p className="text-sm text-neutral-400">Peça um novo link na tela de entrada, em “Esqueci minha senha”.</p>
            <Button onClick={() => navigate('/login', { replace: true })} className="w-full bg-[#f8b400] hover:bg-[#e0a300] text-neutral-900 font-semibold">
              Voltar para a entrada
            </Button>
          </div>
        )}

        {estado === 'pronto' && (
          <form onSubmit={salvar} className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="nova-senha" className="text-neutral-300">Nova senha</Label>
              <Input
                id="nova-senha" type="password" required value={senha} onChange={(e) => setSenha(e.target.value)}
                disabled={salvando} autoComplete="new-password" minLength={8}
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirma-senha" className="text-neutral-300">Repita a nova senha</Label>
              <Input
                id="confirma-senha" type="password" required value={confirmacao} onChange={(e) => setConfirmacao(e.target.value)}
                disabled={salvando} autoComplete="new-password" minLength={8}
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
            </div>
            <p className="text-xs text-neutral-400">Mínimo de 8 caracteres. Depois de salvar, você entra com a senha nova e o portal vai pedir a configuração do aplicativo autenticador (2FA).</p>
            <Button type="submit" disabled={salvando} className="mt-1 bg-[#f8b400] hover:bg-[#e0a300] text-neutral-900 font-semibold">
              {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar senha'}
            </Button>
          </form>
        )}
      </Card>
    </div>
  );
}
