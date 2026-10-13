import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2, QrCode, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type Estado = "carregando" | "open" | "connecting" | "close" | "desconhecido" | "erro";

// Instância compartilhada de toda a rede (não é por unidade) -- se cair,
// nenhuma unidade recebe/manda mensagem pelo chat do /comercial até
// reconectar aqui.
export default function WhatsAppConexao() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [acionando, setAcionando] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function consultar(acao: "status" | "conectar") {
    const { data, error } = await supabase.functions.invoke<{ estado: Estado; qrcode: string | null }>("franquia-whatsapp-status", { body: { acao } });
    if (error) {
      // supabase-js só dá um erro genérico em error.message -- a mensagem de
      // verdade (ex: "só o franqueador pode...") vem no corpo da resposta.
      let detalhe = error.message;
      const contexto = (error as { context?: Response }).context;
      if (contexto) {
        try { detalhe = (await contexto.clone().json())?.mensagem ?? detalhe; } catch { /* corpo não era JSON */ }
      }
      console.error("Falha ao consultar status do WhatsApp:", detalhe);
      setErroDetalhe(detalhe);
      setEstado("erro");
      return;
    }
    setErroDetalhe(null);
    setEstado(data?.estado ?? "desconhecido");
    setQrcode(data?.qrcode ?? null);
  }

  useEffect(() => {
    void consultar("status");
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function handleConectar() {
    setAcionando(true);
    await consultar("conectar");
    setAcionando(false);
    // Enquanto espera o celular escanear, confere sozinho a cada 4s até conectar.
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const { data } = await supabase.functions.invoke<{ estado: Estado; qrcode: string | null }>("franquia-whatsapp-status", { body: { acao: "status" } });
      if (!data) return;
      setEstado(data.estado);
      if (data.estado === "open") {
        if (pollRef.current) clearInterval(pollRef.current);
        setQrcode(null);
        toast.success("WhatsApp conectado.");
      }
    }, 4000);
  }

  const conectado = estado === "open";

  return (
    <div className="max-w-md mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp da rede</h1>
        <p className="text-sm text-muted-foreground">Número usado no chat do funil comercial de todas as unidades.</p>
      </div>

      <Card className="p-6 flex flex-col items-center gap-4 text-center">
        {estado === "carregando" && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}

        {estado === "erro" && (
          <>
            <p className="text-sm text-destructive">{erroDetalhe || "Não foi possível falar com o servidor de WhatsApp agora."}</p>
            <Button variant="outline" size="sm" onClick={() => void consultar("status")}><RefreshCw className="h-4 w-4 mr-2" />Tentar de novo</Button>
          </>
        )}

        {conectado && (
          <>
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
            <p className="font-medium">Conectado</p>
            <p className="text-xs text-muted-foreground">Se precisar trocar de número, desconecte no aparelho antes de gerar um QR code novo.</p>
          </>
        )}

        {!conectado && estado !== "carregando" && estado !== "erro" && (
          <>
            {qrcode ? (
              <>
                <img src={qrcode} alt="QR code para conectar o WhatsApp" className="w-56 h-56 rounded-md border" />
                <p className="text-xs text-muted-foreground">
                  No celular: WhatsApp → Configurações → Aparelhos conectados → Conectar um aparelho. O código expira em pouco tempo.
                </p>
                <Button variant="outline" size="sm" disabled={acionando} onClick={() => void handleConectar()}>
                  {acionando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Gerar novo código
                </Button>
              </>
            ) : (
              <>
                <QrCode className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Desconectado.</p>
                <Button disabled={acionando} onClick={() => void handleConectar()}>
                  {acionando ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <QrCode className="h-4 w-4 mr-2" />}
                  Conectar WhatsApp
                </Button>
              </>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
