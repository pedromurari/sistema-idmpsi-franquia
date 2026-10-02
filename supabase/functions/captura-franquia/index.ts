import { createClient } from "npm:@supabase/supabase-js@2";
import { validarCaptura } from "./validacao.ts";

const origens = (Deno.env.get("CAPTURA_ALLOWED_ORIGINS") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const hosts = (Deno.env.get("CAPTURA_ALLOWED_HOSTNAMES") ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
const turnstileSecret = Deno.env.get("CAPTURA_TURNSTILE_SECRET");
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
  if (!turnstileSecret || !dbSecret || !supabaseUrl || !hosts.length) return resposta(503, "Captação temporariamente indisponível.");
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
  let verificado: { success?: boolean; hostname?: string };
  try {
    const validacao = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret: turnstileSecret, response: entrada.token }),
      signal: AbortSignal.timeout(5000),
    });
    if (!validacao.ok) return resposta(503, "Verificação indisponível. Tente mais tarde.");
    verificado = await validacao.json();
  } catch {
    return resposta(503, "Verificação indisponível. Tente mais tarde.");
  }
  if (!verificado.success || !hosts.includes((verificado.hostname ?? "").toLowerCase()))
    return resposta(400, "Verificação inválida. Atualize a página e tente novamente.");
  const admin = createClient(supabaseUrl, dbSecret, { auth: { persistSession: false, autoRefreshToken: false } });
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
