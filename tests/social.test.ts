import { test } from "node:test";
import assert from "node:assert/strict";
import { proximosCortes } from "../src/lib/social.ts";

test("dez cortes ocupam segunda, quarta e sexta por semana", () => {
  assert.deepEqual(proximosCortes(new Date(2026, 9, 2)), [
    "2026-10-05", "2026-10-07", "2026-10-09",
    "2026-10-12", "2026-10-14", "2026-10-16",
    "2026-10-19", "2026-10-21", "2026-10-23", "2026-10-26",
  ]);
});
