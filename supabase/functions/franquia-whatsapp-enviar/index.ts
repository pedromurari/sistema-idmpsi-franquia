import { createClient } from "npm:@supabase/supabase-js@2";

// Envia mensagem de WhatsApp pra um lead via Evolution API e registra no
// histórico. Chamada autenticada (franqueado/vendedor/franqueador) -- a
// Evolution API key nunca vai pro navegador, só existe aqui como secret.
const evolutionUrl = Deno.env.get("EVOLUTION_API_URL");
const evolutionInstance = Deno.env.get("EVOLUTION_INSTANCE");
const evolutionApiKey = Deno.env.get("EVOLUTION_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

// Mesma lógica de CORS do franquia-whatsapp-status -- sem isso o navegador
// bloqueia a resposta e o erro real nunca chega na tela.
const origensPermitidas = ["https://sistema.idmpsifranquia.com", "http://localhost:8090"];

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const origemOk = origensPermitidas.includes(origin);
  const cabecalhos = {
    "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": origemOk ? origin : origensPermitidas[0],
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Vary": "Origin",
  };
  const resposta = (status: number, corpo: Record<string, unknown>) => new Response(JSON.stringify(corpo), { status, headers: cabecalhos });

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cabecalhos });
  if (req.method !== "POST") return resposta(405, { mensagem: "Método não permitido." });
  if (!evolutionUrl || !evolutionInstance || !evolutionApiKey || !supabaseUrl || !anonKey || !serviceRoleKey) {
    return resposta(503, { mensagem: "Indisponível." });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return resposta(401, { mensagem: "Não autenticado." });

  let entrada: { leadId?: string; texto?: string };
  try {
    entrada = await req.json();
  } catch {
    return resposta(400, { mensagem: "JSON inválido." });
  }
  const leadId = entrada.leadId;
  const texto = entrada.texto?.trim();
  if (!leadId || !texto || texto.length > 4096) return resposta(400, { mensagem: "Informe leadId e texto (até 4096 caracteres)." });

  // Cliente com o JWT de quem chamou -- a RLS de franquia_expansao_leads só
  // libera pra franqueador (é infraestrutura da franqueadora, nunca de uma
  // unidade -- ver franquia-whatsapp-status pro mesmo princípio).
  const comoUsuario = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: lead, error: leadError } = await comoUsuario
    .from("franquia_expansao_leads")
    .select("id, whatsapp")
    .eq("id", leadId)
    .maybeSingle();

  if (leadError) { console.error("Falha ao validar acesso ao lead", leadError.code); return resposta(503, { mensagem: "Não foi possível enviar agora." }); }
  if (!lead) return resposta(404, { mensagem: "Lead não encontrado ou sem acesso." });
  if (!lead.whatsapp) return resposta(422, { mensagem: "Esse lead não tem WhatsApp cadastrado." });

  const { data: userData } = await comoUsuario.auth.getUser();
  const remetente = userData?.user?.id ?? null;

  const digitos = lead.whatsapp.replace(/\D/g, "");
  const numero = digitos.length === 10 || digitos.length === 11 ? `55${digitos}` : digitos;

  const envioResp = await fetch(`${evolutionUrl}/message/sendText/${evolutionInstance}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: evolutionApiKey },
    body: JSON.stringify({ number: numero, text: texto }),
  });
  if (!envioResp.ok) {
    console.error("Falha ao enviar via Evolution", envioResp.status);
    return resposta(502, { mensagem: "Não foi possível enviar a mensagem pelo WhatsApp agora." });
  }
  const envioJson = await envioResp.json().catch(() => null);
  const evolutionMessageId: string | null = envioJson?.key?.id ?? null;

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: insertError } = await admin.from("franquia_expansao_mensagens").insert({
    lead_id: lead.id,
    direcao: "enviada",
    conteudo: texto,
    remetente,
    evolution_message_id: evolutionMessageId,
  });
  if (insertError && insertError.code !== "23505") {
    console.error("Mensagem enviada mas falhou ao registrar", insertError.code);
  }

  return resposta(200, { mensagem: "Enviado." });
});
