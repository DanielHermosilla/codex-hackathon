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
      arena.acido ||
      arena.barril ||
      arena.resultadoAcido ||
      arena.explosion ||
      arena.luz ||
      c.ritos.tipo
    ) {
      assert.notEqual(c.jefe.accion?.tipo, "ataque");
      assert.equal(c.proyectiles.usados, 0);
      if (arena.resultadoAcido) assert.equal(arena.luz, null);
    }
    ataque ||= c.jefe.accion?.tipo === "ataque";
    if (c.avisoRito && avisos.at(-1) !== c.avisoRito) avisos.push(c.avisoRito);
  }
  assert.deepEqual(avisos, ["acido", "luz", "pisoton", "braseros", "acido"]);
  assert.ok(ataque);
  const nuevo = reintentar(c);
  assert.equal(nuevo.turnoArena, 0);
  assert.equal(nuevo.arenaMirra.charcos.length, 0);
});

it("victoria y derrota cierran el especial de la arena antes de mostrar el resultado", () => {
  for (const gana of [true, false]) {
    const c = crearCombate(CONFIG);
    saltarPresentacion(c);
    const quietos = [emptyInput(), emptyInput()];
    // En el cuarto segundo aparece el barril y la mira de ácido.
    for (let i = 0; i < 250; i++) pasoCombate(c, quietos, 1 / 60);
    const temporal = c.arenaMirra.barril;
    assert.ok(temporal && c.arenaMirra.acido);
    assert.ok(c.w.pillars.includes(temporal));
    if (gana) ponerVidaJefe(c, 0);
    else for (const jugador of c.w.players) killPlayer(jugador);
    pasoCombate(c, quietos, 1 / 60);
    assert.equal(c.estado, gana ? "victoria" : "derrota");
    assert.equal(c.arenaMirra.acido, null);
    assert.equal(c.arenaMirra.barril, null);
    assert.ok(!c.w.pillars.includes(temporal));
    assert.equal(c.avisoRito, "");
  }
});
