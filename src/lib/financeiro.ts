export interface Turma {
  id: string;
  franquia_id: string;
  nome: string;
  curso: string;
  data_inicio: string | null;
  data_fim: string | null;
  capacidade: number | null;
  ativo: boolean;
  updated_at: string;
}

export interface Lancamento {
  id: string;
  franquia_id: string;
  turma_id: string | null;
  competencia: string;
  data_liquidacao: string | null;
  tipo: "receita" | "despesa";
  categoria: string;
  descricao: string | null;
  valor: number;
  updated_at: string;
}

export interface RegraRoyalties {
  id: string;
  franquia_id: string;
  competencia: string;
  base: "caixa" | "competencia";
  percentual: number;
  updated_at: string;
}

export const formatCurrency = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    valor,
  );
export const formatData = (data: string | null) =>
  data ? data.split("-").reverse().join("/") : "—";
export const hoje = () => {
  const data = new Date();
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};
export const mesAtual = () => hoje().slice(0, 7);

export function limitesMes(mes: string) {
  if (
    !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ||
    Number(mes.slice(0, 4)) < 1900 ||
    Number(mes.slice(0, 4)) > 9998
  ) {
    throw new Error("Informe um mês válido entre 1900 e 9998.");
  }
  const [ano, numero] = mes.split("-").map(Number);
  return {
    inicio: `${mes}-01`,
    fim:
      numero === 12
        ? `${ano + 1}-01-01`
        : `${ano}-${String(numero + 1).padStart(2, "0")}-01`,
  };
}

// Formulários aceitam vírgula ou ponto decimal, sem separador de milhar.
export function lerDecimal(texto: string, maximo: number, permiteZero = false) {
  const normalizado = texto.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado))
    throw new Error(
      "Use um número com até duas casas decimais, sem separador de milhar.",
    );
  const valor = Number(normalizado);
  if (
    !Number.isFinite(valor) ||
    valor > maximo ||
    (permiteZero ? valor < 0 : valor <= 0)
  ) {
    throw new Error(
      `Informe um valor ${permiteZero ? "entre 0" : "maior que 0 e até"} ${maximo}.`,
    );
  }
  return valor;
}

export function resumoFinanceiro(
  lancamentos: Pick<Lancamento, "tipo" | "valor">[],
) {
  let receitaCentavos = 0;
  let despesaCentavos = 0;
  for (const item of lancamentos) {
    const centavos = Math.round(Number(item.valor) * 100);
    if (!Number.isSafeInteger(centavos) || centavos < 0)
      throw new Error("Valor financeiro inválido.");
    if (item.tipo === "receita") receitaCentavos += centavos;
    else despesaCentavos += centavos;
  }
  if (
    !Number.isSafeInteger(receitaCentavos) ||
    !Number.isSafeInteger(despesaCentavos)
  )
    throw new Error("Total excede o limite de cálculo.");
  return {
    receita: receitaCentavos / 100,
    despesa: despesaCentavos / 100,
    resultado: (receitaCentavos - despesaCentavos) / 100,
  };
}

export function calcularRoyalties(receita: number, percentual: number) {
  if (!Number.isFinite(percentual) || percentual < 0 || percentual > 100)
    throw new Error("Percentual inválido.");
  // Arredonda uma única vez sobre a receita total, em centavos, half-up.
  const centavos = Math.round(receita * 100);
  if (!Number.isSafeInteger(centavos) || centavos < 0)
    throw new Error("Receita inválida.");
  const pontosBase = BigInt(Math.round(percentual * 100));
  return Number((BigInt(centavos) * pontosBase + 5000n) / 10000n) / 100;
}

export function filtrarTurma<T extends { turma_id: string | null }>(
  itens: T[],
  filtro: string,
) {
  return filtro === "todas"
    ? itens
    : itens.filter((item) =>
        filtro === "sem-turma"
          ? item.turma_id === null
          : item.turma_id === filtro,
      );
}

// PostgREST limita respostas por página. Buscar até a página vazia também
// funciona quando o servidor configura um limite menor que o solicitado.
export async function todasPaginas<T>(
  buscar: (
    de: number,
    ate: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const itens: T[] = [];
  for (;;) {
    const { data, error } = await buscar(itens.length, itens.length + 499);
    if (error) throw new Error(error.message);
    if (!data?.length) return itens;
    itens.push(...data);
  }
}
