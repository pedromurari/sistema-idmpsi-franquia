import { useState, type FormEvent } from "react";
import { useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { areaDaRota, rotaLimpa, tipos, type TipoSugestao } from "@/lib/sugestoes";
import { Campo, selectClass } from "@/components/financeiro/Shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Botão fixo em todas as telas logadas: quem está usando anota na hora o que
// falta ou o que não funcionou naquela tela. A tela de origem vai junto, sem
// a pessoa precisar explicar onde estava.
export function FeedbackBox() {
  const location = useLocation();
  const client = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [tipo, setTipo] = useState<TipoSugestao>("melhoria");
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const area = areaDaRota(location.pathname);

  function fechar() {
    if (enviando) return;
    setAberto(false);
    setErro("");
  }

  async function enviar(event: FormEvent) {
    event.preventDefault();
    if (enviando) return;
    if (texto.trim().length < 3) return setErro("Escreva pelo menos algumas palavras.");
    setEnviando(true);
    setErro("");
    const { error } = await supabase.from("franquia_sugestoes").insert({
      rota: rotaLimpa(location.pathname),
      area,
      tipo,
      texto: texto.trim(),
    });
    setEnviando(false);
    if (error) return setErro("Não foi possível enviar agora. Tente novamente.");
    toast.success("Sugestão registrada. Obrigado!");
    setTexto("");
    setTipo("melhoria");
    setAberto(false);
    void client.invalidateQueries({ queryKey: ["sugestoes"] });
  }

  return (
    <>
      <Button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={`Enviar sugestão sobre ${area}`}
        className="fixed bottom-4 right-4 z-50 gap-2 rounded-full shadow-lg bg-[#f8b400] text-neutral-900 hover:bg-[#e0a300]"
      >
        <MessageSquarePlus className="h-4 w-4" />
        <span className="hidden sm:inline">Sugestão</span>
      </Button>
      <Dialog open={aberto} onOpenChange={(open) => (open ? setAberto(true) : fechar())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sugestão para “{area}”</DialogTitle>
            <DialogDescription>
              Conte o que melhoraria, o que não funcionou ou o que falta nesta tela.
              A administração acompanha tudo que chega aqui.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void enviar(e)} className="space-y-4">
            <fieldset disabled={enviando} className="space-y-4">
              <Campo id="sugestao-tipo" label="Tipo">
                <select
                  id="sugestao-tipo"
                  className={selectClass}
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as TipoSugestao)}
                >
                  {Object.entries(tipos).map(([valor, nome]) => (
                    <option key={valor} value={valor}>{nome}</option>
                  ))}
                </select>
              </Campo>
              <Campo id="sugestao-texto" label="O que precisa?">
                <textarea
                  id="sugestao-texto"
                  required
                  rows={6}
                  maxLength={4000}
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Ex.: aqui precisa mostrar o total por vendedor..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                />
              </Campo>
              {erro && <p role="alert" className="text-sm text-destructive">{erro}</p>}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={fechar}>Cancelar</Button>
                <Button type="submit">{enviando ? "Enviando…" : "Enviar sugestão"}</Button>
              </div>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
