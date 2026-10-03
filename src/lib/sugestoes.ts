// Caixa de sugestões da equipe: rótulos das telas, tipos, status e o texto em
// Markdown que o Pedro cola no Claude/Codex pra transformar sugestão em tarefa.

export type TipoSugestao = "melhoria" | "problema" | "ideia";
export type StatusSugestao =
  | "novo"
  | "em_analise"
  | "em_andamento"
  | "feito"
  | "descartado";

export interface Sugestao {
  id: string;
  autor_nome: string;
  rota: string;
  area: string;
  tipo: TipoSugestao;
  texto: string;
  status: StatusSugestao;
  resposta: string | null;
  created_at: string;
}

export const tipos: Record<TipoSugestao, string> = {
  melhoria: "Melhoria",
  problema: "Problema",
  ideia: "Ideia nova",
};

export const statusRotulo: Record<StatusSugestao, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  em_andamento: "Em andamento",
  feito: "Feito",
  descartado: "Descartado",
};

export const statusAbertos: StatusSugestao[] = ["novo", "em_analise", "em_andamento"];

const rotulosArea: Record<string, string> = {
  "/dashboard": "Painel da unidade",
  "/rede": "Visão da rede",
  "/unidades": "Unidades",
  "/turmas": "Turmas",
  "/comercial": "Comercial",
  "/dre": "Financeiro",
  "/notas": "Notas Fiscais",
  "/expansao": "Venda de franquias",
  "/social-franqueadora": "Social mídia central",
  "/social-unidade": "Social mídia",
  "/sugestoes": "Sugestões da equipe",
};

/** Caminho limpo (só o que o banco aceita), sem parâmetros de URL. */
export function rotaLimpa(pathname: string) {
  const limpa = pathname.toLowerCase().replace(/[^a-z0-9/_-]/g, "").slice(0, 80);
  return limpa.startsWith("/") ? limpa : "/";
}

export function areaDaRota(pathname: string) {
  return rotulosArea[rotaLimpa(pathname)] ?? rotaLimpa(pathname);
}

const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

/** Lista agrupada por tela, pronta pra colar numa conversa com o Claude/Codex. */
export function sugestoesEmMarkdown(lista: Sugestao[], hoje = new Date()) {
  if (!lista.length) return "Nenhuma sugestão pendente.";
  const porArea = new Map<string, Sugestao[]>();
  for (const item of lista) {
    const chave = `${item.area} (${item.rota})`;
    porArea.set(chave, [...(porArea.get(chave) ?? []), item]);
  }
  const linhas = [
    `# Sugestões da equipe — Portal da franquia (${dataCurta(hoje.toISOString())})`,
    "",
  ];
  for (const [area, itens] of porArea) {
    linhas.push(`## ${area}`);
    for (const item of itens) {
      const texto = item.texto.trim().replace(/\n+/g, " ");
      linhas.push(
        `- [${tipos[item.tipo].toLowerCase()} · ${statusRotulo[item.status].toLowerCase()}] ${texto} — ${item.autor_nome}, ${dataCurta(item.created_at)} (id ${item.id.slice(0, 8)})`,
      );
      if (item.resposta) linhas.push(`  - Resposta: ${item.resposta.trim().replace(/\n+/g, " ")}`);
    }
    linhas.push("");
  }
  return linhas.join("\n").trimEnd();
}
