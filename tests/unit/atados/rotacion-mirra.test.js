import { it } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  crearCombate,
  pasoCombate,
  saltarPresentacion,
  reintentar,
} from "../../../src/atados/gameplay/combate.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";

it("Mirra alterna las cuatro señales, mantiene sus ataques y limpia la arena al reintentar", () => {
  const cfg = structuredClone(CONFIG);
  cfg.player.maxHp = 100000;
  const c = crearCombate(cfg);
  saltarPresentacion(c);
  const entrada = [emptyInput(), emptyInput()];
  const avisos = [];
  let ataque = false;
  for (let i = 0; i < 42 * 60; i++) {
    pasoCombate(c, entrada, 1 / 60);
    const arena = c.arenaMirra;
    if (
      arena.orbe ||
      arena.pilar ||
      arena.explosion ||
      arena.luz ||
      c.ritos.tipo
    ) {
      assert.notEqual(c.jefe.accion?.tipo, "ataque");
      assert.equal(c.proyectiles.usados, 0);
    }
    ataque ||= c.jefe.accion?.tipo === "ataque";
    if (c.avisoRito && avisos.at(-1) !== c.avisoRito) avisos.push(c.avisoRito);
  }
  assert.deepEqual(avisos, ["orbe", "luz", "pisoton", "braseros", "orbe"]);
  assert.ok(ataque);
  const nuevo = reintentar(c);
  assert.equal(nuevo.turnoArena, 0);
  assert.equal(nuevo.arenaMirra.huecos.length, 0);
});
