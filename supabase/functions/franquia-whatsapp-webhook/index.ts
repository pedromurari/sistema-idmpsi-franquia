import { createClient } from "npm:@supabase/supabase-js@2";

// Recebe o webhook da Evolution API (instância dedicada da franquia,
// "idm-franquia-01") e grava a mensagem na conversa do lead. Só isso --
// nunca chama a Evolution de volta daqui (isso é o franquia-whatsapp-enviar).
// Autenticação: segredo compartilhado na própria URL do webhook (?secret=),
// já que a Evolution não assina o payload -- o endpoint é público (webhook
// de serviço externo), então essa é a única barreira contra spoofing.
const webhookSecret = Deno.env.get("EVOLUTION_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

function extrairTexto(mensagem: Record<string, unknown> | undefined): string | null {
  if (!mensagem) return null;
  const m = mensagem as Record<string, any>;
  const texto = m.conversation ?? m.extendedTextMessage?.text ?? m.imageMessage?.caption ?? m.videoMessage?.caption ?? null;
  return typeof texto === "string" && texto.trim().length > 0 ? texto.trim().slice(0, 4096) : null;
}

Deno.serve(async (req) => {
  const cabecalhos = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  const resposta = (status: number, corpo: Record<string, unknown>) => new Response(JSON.stringify(corpo), { status, headers: cabecalhos });

  if (req.method !== "POST") return resposta(405, { mensagem: "Método não permitido." });
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) return resposta(503, { mensagem: "Indisponível." });

  const url = new URL(req.url);
  if (url.searchParams.get("secret") !== webhookSecret) return resposta(401, { mensagem: "Não autorizado." });

  let payload: Record<string, any>;
  try {
    payload = await req.json();
  } catch {
    return resposta(400, { mensagem: "JSON inválido." });
  }

  // A Evolution manda vários eventos (connection.update, qrcode.updated etc.) --
  // só nos interessa mensagem nova.
  if (payload.event !== "messages.upsert") return resposta(200, { mensagem: "Ignorado." });

  const dados = Array.isArray(payload.data) ? payload.data[0] : payload.data;
  const remoteJid: string | undefined = dados?.key?.remoteJid;
  const messageId: string | undefined = dados?.key?.id;
  const fromMe: boolean = Boolean(dados?.key?.fromMe);
  if (!remoteJid || remoteJid.endsWith("@g.us")) return resposta(200, { mensagem: "Ignorado (grupo ou sem remetente)." });

  const texto = extrairTexto(dados?.message);
  if (!texto) return resposta(200, { mensagem: "Sem texto reconhecido, ignorado." });

  const digitos = remoteJid.split("@")[0].replace(/\D/g, "");
  if (digitos.length < 8) return resposta(200, { mensagem: "Telefone inválido, ignorado." });

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Instância é só da franqueadora -- procura em franquia_expansao_leads
  // (venda de franquia), nunca em franquia_leads (aluno de unidade).
  const { data: lead, error: leadError } = await admin
    .from("franquia_expansao_leads")
    .select("id")
    .ilike("whatsapp", `%${digitos.slice(-8)}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (leadError) {
    console.error("Falha ao buscar lead pelo telefone", leadError.code);
    return resposta(503, { mensagem: "Não foi possível processar agora." });
  }
  if (!lead) return resposta(200, { mensagem: "Nenhum lead de expansão encontrado para esse número, ignorado." });

  const { error: insertError } = await admin.from("franquia_expansao_mensagens").insert({
    lead_id: lead.id,
    direcao: fromMe ? "enviada" : "recebida",
    conteudo: texto,
    evolution_message_id: messageId ?? null,
  });

  if (insertError && insertError.code !== "23505") { // 23505 = duplicado (mesma mensagem reenviada pela Evolution), ok ignorar
    console.error("Falha ao gravar mensagem", insertError.code);
    return resposta(503, { mensagem: "Não foi possível gravar agora." });
  }

  return resposta(200, { mensagem: "Recebido." });
});
