import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { LoginBackground } from '@/components/LoginBackground';
import { toast } from 'sonner';
import { Loader2, ShieldCheck } from 'lucide-react';

// Acesso a dado fiscal/financeiro de terceiro (franqueado) exige 2FA -- não é
// opcional, por isso não existe botão "pular". 'enroll': sem fator TOTP
// verificado ainda, mostra o QR code pra cadastrar no primeiro login.
// 'challenge': já tem fator, só pede o código de 6 dígitos desta sessão.
export default function MfaGate() {
  const { mfaStatus, refreshMfaStatus, logout } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [codigo, setCodigo] = useState('');
  const [preparando, setPreparando] = useState(true);
  const [verificando, setVerificando] = useState(false);

  useEffect(() => {
    let ativo = true;
    const preparar = async () => {
      setPreparando(true);
      if (mfaStatus === 'enroll') {
        // Reaproveita um fator TOTP não-verificado já existente (ex: a pessoa
        // fechou a aba no meio do cadastro) em vez de tentar criar outro --
        // o Supabase recusa dois fatores TOTP com o mesmo nome.
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const pendente = factors?.all.find((f) => f.factor_type === 'totp' && f.status === 'unverified');
        if (pendente) {
          await supabase.auth.mfa.unenroll({ factorId: pendente.id });
        }
        const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'Portal do Franqueado' });
        if (!ativo) return;
        if (error || !data) { toast.error(error?.message || 'Não foi possível iniciar o cadastro do 2FA.'); setPreparando(false); return; }
        setFactorId(data.id);
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
      } else if (mfaStatus === 'challenge') {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const fator = factors?.totp[0];
        if (!ativo) return;
        if (!fator) { toast.error('Fator de 2FA não encontrado.'); setPreparando(false); return; }
        setFactorId(fator.id);
      }
      if (ativo) setPreparando(false);
    };
    preparar();
    return () => { ativo = false; };
  }, [mfaStatus]);

  const handleVerificar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setVerificando(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      toast.error(challengeError?.message || 'Não foi possível gerar o desafio de 2FA.');
      setVerificando(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: codigo });
    setVerificando(false);
    if (verifyError) { toast.error('Código inválido. Confira o app autenticador e tente de novo.'); setCodigo(''); return; }
    toast.success(mfaStatus === 'enroll' ? '2FA ativado com sucesso.' : 'Verificado.');
    await refreshMfaStatus();
  };

  const titulo = mfaStatus === 'enroll' ? 'Ative a verificação em duas etapas' : 'Confirme sua identidade';
  const subtitulo = mfaStatus === 'enroll'
    ? 'Obrigatório neste portal -- protege o dado fiscal e financeiro da sua unidade.'
    : 'Digite o código do seu app autenticador.';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <LoginBackground />
      <Card className="w-full max-w-sm p-6 relative bg-neutral-900 border-neutral-800 text-white">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <ShieldCheck className="h-10 w-10 text-[#f8b400]" />
          <h1 className="text-base font-semibold">{titulo}</h1>
          <p className="text-sm text-neutral-400">{subtitulo}</p>
        </div>

        {preparando ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
        ) : (
          <form onSubmit={handleVerificar} className="flex flex-col gap-4">
            {mfaStatus === 'enroll' && qrCode && (
              <div className="flex flex-col items-center gap-2">
                <div className="bg-white p-2 rounded" dangerouslySetInnerHTML={{ __html: qrCode }} />
                <p className="text-xs text-neutral-500 text-center">
                  Escaneie com Google Authenticator, Authy ou outro app TOTP.
                  {secret && <> Não consegue escanear? Código manual: <span className="font-mono text-neutral-300">{secret}</span></>}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="codigo" className="text-neutral-300">Código de 6 dígitos</Label>
              <Input
                id="codigo" inputMode="numeric" autoComplete="one-time-code" required
                value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={verificando} maxLength={6}
                className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 text-center text-lg tracking-widest"
              />
            </div>
            <Button
              type="submit" disabled={verificando || codigo.length !== 6}
              className="mt-2 bg-[#f8b400] hover:bg-[#e0a300] text-neutral-900 font-semibold"
            >
              {verificando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </Button>
            <button type="button" onClick={() => logout()} className="text-xs text-neutral-500 hover:text-neutral-300 underline underline-offset-2">
              Sair e entrar com outra conta
            </button>
          </form>
        )}
      </Card>
    </div>
  );
}
