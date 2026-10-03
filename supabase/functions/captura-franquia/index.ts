import { createClient } from "npm:@supabase/supabase-js@2";
import { validarCaptura } from "./validacao.ts";

const origens = (Deno.env.get("CAPTURA_ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const rateSecret = Deno.env.get("CAPTURA_RATE_SECRET");
const dbSecret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const permitido = origens.includes(origin);
  const cabecalhos = { "Access-Control-Allow-Origin": permitido ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin", "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  const resposta = (status: number, mensagem: string) => new Response(JSON.stringify({ mensagem }), { status, headers: cabecalhos });
  if (!permitido) return resposta(403, "Origem não permitida.");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cabecalhos });
  if (req.method !== "POST") return resposta(405, "Método não permitido.");
  if (!rateSecret || !dbSecret || !supabaseUrl) return resposta(503, "Captação temporariamente indisponível.");
  if (!req.headers.get("content-type")?.startsWith("application/json")) return resposta(415, "Envie JSON.");
  let entrada: ReturnType<typeof validarCaptura>;
  try {
    if (Number(req.headers.get("content-length") ?? 0) > 4096) return resposta(413, "Envio muito grande.");
    const corpo = await req.text();
    if (corpo.length > 4096) return resposta(413, "Envio muito grande.");
    entrada = validarCaptura(JSON.parse(corpo));
  } catch (erro) {
    return resposta(400, erro instanceof Error ? erro.message : "Dados inválidos.");
  }
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  if (!ip || ip.length > 64) return resposta(503, "Captação temporariamente indisponível.");
  const contato = entrada.email || entrada.whatsapp!.replace(/\D/g, "");
  const chave = await crypto.subtle.importKey("raw", new TextEncoder().encode(rateSecret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const hash = async (valor: string) => Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", chave,
    new TextEncoder().encode(valor)))).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const admin = createClient(supabaseUrl, dbSecret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admitido, error: limiteErro } = await admin.rpc("franquia_captura_admitir", {
    p_ip_hash: await hash(`ip:${ip}`), p_contato_hash: await hash(`contato:${contato}`),
  });
  if (limiteErro) {
    console.error("Falha ao validar limite da captura", limiteErro.code);
    return resposta(503, "Não foi possível enviar agora. Tente mais tarde.");
  }
  if (!admitido) return resposta(429, "Muitas tentativas. Aguarde e tente novamente.");
  const { error } = await admin.from("franquia_expansao_leads").insert({
    nome: entrada.nome, whatsapp: entrada.whatsapp, email: entrada.email,
    cidade: entrada.cidade, estado: entrada.estado, origem: "captura",
    dados_extras: { consentimento_contato_em: new Date().toISOString(), versao_consentimento: "2026-10",
      ...(entrada.motivacao ? { motivacao: entrada.motivacao } : {}) },
  });
  if (error) {
    console.error("Falha ao registrar interesse de franquia", error.code);
    return resposta(503, "Não foi possível enviar agora. Tente mais tarde.");
  }
  return resposta(201, "Recebemos seu interesse. Nossa equipe entrará em contato.");
});
