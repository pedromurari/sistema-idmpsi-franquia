export interface CapturaValida {
  nome: string;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  motivacao: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  fbclid: string | null;
  gclid: string | null;
  referrerHost: string | null;
  landingPath: string | null;
}

export function validarCaptura(valor: unknown): CapturaValida {
  if (!valor || typeof valor !== "object" || Array.isArray(valor)) throw new Error("Dados inválidos.");
  const entrada = valor as Record<string, unknown>;
  const texto = (chave: string, maximo: number) => {
    const valor = entrada[chave];
    if (valor !== undefined && valor !== null && typeof valor !== "string") throw new Error("Dados inválidos.");
    const limpo = (valor ?? "").toString().trim();
    if (limpo.length > maximo) throw new Error("Campo longo demais.");
    return limpo;
  };
  // Igual a `texto`, mas corta em vez de rejeitar -- usado só pra atribuição
  // de campanha (UTM/fbclid/referrer). Esses valores vêm da URL, não de
  // digitação, e um lead real não pode se perder por causa de um parâmetro
  // de rastreio malformado ou longo demais.
  const textoOpcional = (chave: string, maximo: number) => {
    const valor = entrada[chave];
    if (valor !== undefined && valor !== null && typeof valor !== "string") return "";
    return (valor ?? "").toString().trim().slice(0, maximo);
  };
  if (texto("empresa", 200)) throw new Error("Envio rejeitado."); // campo invisível para bots
  const nome = texto("nome", 160);
  const whatsapp = texto("whatsapp", 30);
  const email = texto("email", 254).toLowerCase();
  const cidade = texto("cidade", 120);
  const estado = texto("estado", 80);
  const motivacao = texto("motivacao", 80);
  if (nome.length < 2 || (!whatsapp && !email)) throw new Error("Informe nome e WhatsApp ou e-mail.");
  if (whatsapp && !/^\d{8,15}$/.test(whatsapp.replace(/\D/g, ""))) throw new Error("WhatsApp inválido.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  if (entrada.consentimento !== true) throw new Error("Confirme o consentimento para contato.");
  if (motivacao && ![
    "Quero empreender em saúde mental", "Busco uma renda extra com educação",
    "Quero expandir meu negócio atual", "Tenho formação na área e quero escalar",
    "Outro motivo",
  ].includes(motivacao)) throw new Error("Motivo de interesse inválido.");
  // Atribuição de campanha -- tudo opcional e silenciosamente ignorado se
  // vier estranho (não vale rejeitar um lead legítimo por causa de um
  // parâmetro de rastreio malformado). fbclid/gclid aceitam token mais longo;
  // o resto é texto curto. Nada disso é executado em lugar nenhum, só
  // armazenado e exibido como texto depois.
  const utmSource = textoOpcional("utmSource", 120);
  const utmMedium = textoOpcional("utmMedium", 120);
  const utmCampaign = textoOpcional("utmCampaign", 160);
  const utmContent = textoOpcional("utmContent", 160);
  const utmTerm = textoOpcional("utmTerm", 160);
  const fbclid = textoOpcional("fbclid", 255);
  const gclid = textoOpcional("gclid", 255);
  const referrerHost = textoOpcional("referrerHost", 255);
  const landingPath = textoOpcional("landingPath", 255);
  return {
    nome, whatsapp: whatsapp || null, email: email || null, cidade: cidade || null, estado: estado || null, motivacao: motivacao || null,
    utmSource: utmSource || null, utmMedium: utmMedium || null, utmCampaign: utmCampaign || null,
    utmContent: utmContent || null, utmTerm: utmTerm || null, fbclid: fbclid || null, gclid: gclid || null,
    referrerHost: referrerHost || null, landingPath: landingPath || null,
  };
}
