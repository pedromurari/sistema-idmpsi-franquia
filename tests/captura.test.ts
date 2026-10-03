import { test } from "node:test";
import assert from "node:assert/strict";
import { validarCaptura } from "../supabase/functions/captura-franquia/validacao.ts";

test("captura aceita somente dados de contato e consentimento", () => {
  const valido = validarCaptura({ nome: "  Maria Silva  ", whatsapp: "(11) 99999-9999", email: " MARIA@EXAMPLE.TEST ",
    cidade: "São Paulo", estado: "SP", motivacao: "Outro motivo", consentimento: true, fase: "fechado", origem: "manual" });
  assert.equal(valido.nome, "Maria Silva");
  assert.equal(valido.email, "maria@example.test");
  assert.equal(valido.motivacao, "Outro motivo");
  assert.equal("fase" in valido, false);
  assert.equal("origem" in valido, false);
  for (const alteracao of [
    { consentimento: false }, { empresa: "bot" }, { whatsapp: "123" }, { nome: "A" },
    { motivacao: "texto arbitrário" },
  ]) {
    assert.throws(() => validarCaptura({ ...valido, consentimento: true, ...alteracao }));
  }
});
