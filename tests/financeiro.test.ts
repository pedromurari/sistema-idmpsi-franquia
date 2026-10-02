import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcularRoyalties,
  filtrarTurma,
  lerDecimal,
  limitesMes,
  resumoFinanceiro,
  todasPaginas,
} from "../src/lib/financeiro.ts";

test("valida mês e transição de ano sem deslocamento de fuso", () => {
  assert.deepEqual(limitesMes("2026-12"), {
    inicio: "2026-12-01",
    fim: "2027-01-01",
  });
  assert.deepEqual(limitesMes("2024-02"), {
    inicio: "2024-02-01",
    fim: "2024-03-01",
  });
  for (const mes of ["", "2026-13", "2026-00", "26-01", "0000-01"])
    assert.throws(() => limitesMes(mes));
});
test("valores monetários não aceitam negativos, NaN, notação científica ou precisão excedente", () => {
  assert.equal(lerDecimal("1250,99", 9999999999.99), 1250.99);
  assert.equal(lerDecimal("0", 100, true), 0);
  for (const valor of [
    "",
    "NaN",
    "-1",
    "1e3",
    "12.345",
    "1.250,00",
    "Infinity",
    "0",
  ])
    assert.throws(() => lerDecimal(valor, 100));
  assert.throws(() => lerDecimal("100.01", 100, true));
});
test("totais usam centavos e royalties arredondam apenas sobre a receita total", () => {
  const resumo = resumoFinanceiro([
    { tipo: "receita", valor: 0.1 },
    { tipo: "receita", valor: 0.2 },
    { tipo: "despesa", valor: 0.05 },
  ]);
  assert.deepEqual(resumo, { receita: 0.3, despesa: 0.05, resultado: 0.25 });
  assert.equal(calcularRoyalties(1000.1, 5), 50.01);
  assert.equal(calcularRoyalties(0.1, 5), 0.01);
  assert.equal(calcularRoyalties(1000, 0), 0);
  assert.equal(calcularRoyalties(9999999999.99, 100), 9999999999.99);
  assert.throws(() => calcularRoyalties(100, 101));
});
test("filtro mantém despesas gerais em sem turma, sem rateio inventado", () => {
  const itens = [{ turma_id: "a" }, { turma_id: "b" }, { turma_id: null }];
  assert.equal(filtrarTurma(itens, "todas").length, 3);
  assert.deepEqual(filtrarTurma(itens, "a"), [itens[0]]);
  assert.deepEqual(filtrarTurma(itens, "sem-turma"), [itens[2]]);
});
test("paginação não perde dados acima do limite do servidor e propaga erro", async () => {
  const origem = Array.from({ length: 1205 }, (_, id) => ({ id }));
  const itens = await todasPaginas((de) =>
    Promise.resolve({ data: origem.slice(de, de + 300), error: null }),
  );
  assert.deepEqual(itens, origem);
  await assert.rejects(
    todasPaginas(() =>
      Promise.resolve({ data: null, error: { message: "Falha" } }),
    ),
    /Falha/,
  );
});
