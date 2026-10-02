export interface CapturaValida {
  nome: string;
  whatsapp: string | null;
  email: string | null;
  cidade: string | null;
  estado: string | null;
  motivacao: string | null;
  token: string;
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
  if (texto("empresa", 200)) throw new Error("Envio rejeitado."); // campo invisível para bots
  const nome = texto("nome", 160);
  const whatsapp = texto("whatsapp", 30);
  const email = texto("email", 254).toLowerCase();
  const cidade = texto("cidade", 120);
  const estado = texto("estado", 80);
  const motivacao = texto("motivacao", 80);
  const token = texto("token", 2048);
  if (nome.length < 2 || (!whatsapp && !email)) throw new Error("Informe nome e WhatsApp ou e-mail.");
  if (whatsapp && !/^\d{8,15}$/.test(whatsapp.replace(/\D/g, ""))) throw new Error("WhatsApp inválido.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  if (entrada.consentimento !== true) throw new Error("Confirme o consentimento para contato.");
  if (motivacao && ![
    "Quero empreender em saúde mental", "Busco uma renda extra com educação",
    "Quero expandir meu negócio atual", "Tenho formação na área e quero escalar",
    "Outro motivo",
  ].includes(motivacao)) throw new Error("Motivo de interesse inválido.");
  if (!token) throw new Error("Confirme a verificação de segurança.");
  return { nome, whatsapp: whatsapp || null, email: email || null, cidade: cidade || null, estado: estado || null, motivacao: motivacao || null, token };
}
