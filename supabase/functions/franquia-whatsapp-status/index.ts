import { createClient } from "npm:@supabase/supabase-js@2";

// Status e QR code de conexão da instância de WhatsApp da franqueadora.
// Só o franqueador pode chamar -- é infraestrutura compartilhada da rede,
// não de uma unidade específica. A chave da Evolution nunca vai pro
// navegador, só a imagem do QR code (que já é pública por natureza).
const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");
const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

Deno.serve(async (req) => {
  const cabecalhos = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  const resposta = (status: number, corpo: Record<string, unknown>) => new Response(JSON.stringify(corpo), { status, headers: cabecalhos });

  if (req.method !== "POST") return resposta(405, { mensagem: "Método não permitido." });
  if (!evolutionUrl || !evolutionInstance || !evolutionApiKey || !supabaseUrl || !anonKey) {
    return resposta(503, { mensagem: "Indisponível." });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return resposta(401, { mensagem: "Não autenticado." });

  const comoUsuario = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: ehFranqueador, error: papelError } = await comoUsuario.rpc("franquia_is_franqueador");
  if (papelError) { console.error("Falha ao checar papel", papelError.code); return resposta(503, { mensagem: "Não foi possível verificar o acesso." }); }
  if (!ehFranqueador) return resposta(403, { mensagem: "Só o franqueador pode gerenciar a conexão do WhatsApp." });

  let acao: string | undefined;
  try {
    acao = (await req.json())?.acao;
  } catch {
    acao = undefined;
  }
  if (acao !== "status" && acao !== "conectar") return resposta(400, { mensagem: "Informe acao: status ou conectar." });

  // 'status' só lê o estado atual; 'conectar' força a Evolution a gerar um
  // QR code novo (ela também devolve o state, então uma chamada só basta
  // pro front decidir o que mostrar).
  const rota = acao === "conectar" ? "connect" : "connectionState";
  const evoResp = await fetch(`${evolutionUrl}/instance/${rota}/${evolutionInstance}`, {
    method: "GET",
    headers: { apikey: evolutionApiKey },
  });
  if (!evoResp.ok) {
    console.error("Falha ao consultar Evolution", evoResp.status);
    return resposta(502, { mensagem: "Não foi possível falar com o servidor de WhatsApp agora." });
  }
  const evoJson = await evoResp.json().catch(() => null);
  const estado: string = evoJson?.instance?.state ?? evoJson?.state ?? "desconhecido";
  const qrcode: string | null = evoJson?.base64 ?? null;

  return resposta(200, { estado, qrcode });
});
