import { it } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  crearCombate,
  pasoCombate,
  saltarPresentacion,
  reintentar,
  ponerVidaJefe,
} from "../../../src/atados/gameplay/combate.js";
import { killPlayer } from "../../../src/atados/gameplay/jugadores.js";
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

it("victoria y derrota cierran el especial de la arena antes de mostrar el resultado", () => {
  for (const gana of [true, false]) {
    const c = crearCombate(CONFIG);
    saltarPresentacion(c);
    const quietos = [emptyInput(), emptyInput()];
    // En el cuarto segundo aparece la pareja orbe/pilar.
    for (let i = 0; i < 250; i++) pasoCombate(c, quietos, 1 / 60);
    const temporal = c.arenaMirra.pilar;
    assert.ok(temporal && c.arenaMirra.orbe);
    assert.ok(c.w.pillars.includes(temporal));
    if (gana) ponerVidaJefe(c, 0);
    else for (const jugador of c.w.players) killPlayer(jugador);
    pasoCombate(c, quietos, 1 / 60);
    assert.equal(c.estado, gana ? "victoria" : "derrota");
    assert.equal(c.arenaMirra.orbe, null);
    assert.equal(c.arenaMirra.pilar, null);
    assert.ok(!c.w.pillars.includes(temporal));
    assert.equal(c.avisoRito, "");
  }
});
