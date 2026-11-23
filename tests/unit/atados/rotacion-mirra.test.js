import { it } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  avisoRitoActual,
  crearCombate,
  pasoCombate,
  saltarPresentacion,
  reintentar,
  ponerVidaJefe,
} from "../../../src/atados/gameplay/combate.js";
import { killPlayer } from "../../../src/atados/gameplay/jugadores.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";

it("Mirra alterna ácido y orbe entre ciclos de cuatro señales, mantiene sus ataques y limpia la arena al reintentar", () => {
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
    const aviso = avisoRitoActual(c);
    if (aviso && avisos.at(-1) !== aviso) avisos.push(aviso);
  }
  assert.deepEqual(avisos, ["acido", "luz", "pisoton", "braseros", "orbe"]);
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
    assert.equal(avisoRitoActual(c), "");
  }
});

it("el HUD omite el aviso si el orbe no encuentra suelo para el pilar", () => {
  const c = crearCombate(CONFIG);
  saltarPresentacion(c);
  c.w.arenaRadius = 2.1; // metros: el pilar necesita aparecer a 4,8 m del objetivo
  c.turnoArena = CONFIG.jefes.mirra.ritual.secuencia.indexOf("orbe");
  const turnoInicial = c.turnoArena;
  c.proximoRito = 0; // el siguiente paso intenta crear el orbe
  pasoCombate(c, [emptyInput(), emptyInput()], CONFIG.sim.fixedDt);
  assert.equal(c.turnoArena, turnoInicial + 1); // sí se intentó iniciar el reto
  assert.equal(c.arenaMirra.orbe, null);
  assert.equal(avisoRitoActual(c), "");
});

it("el aviso de luz termina al destello y el de braseros al perder ambos tiros", () => {
  const c = crearCombate(CONFIG);
  saltarPresentacion(c);
  const quietos = [emptyInput(), emptyInput()];
  const paso = () => pasoCombate(c, quietos, CONFIG.sim.fixedDt);
  c.turnoArena = 1; // primer ciclo: ácido, luz, pisotón, braseros
  c.proximoRito = 0;
  paso();
  assert.equal(avisoRitoActual(c), "luz");
  assert.ok(c.arenaMirra.luz);
  for (let i = 1; i < 150; i++) paso(); // 150 cuadros = 2,5 s de aviso
  assert.equal(c.arenaMirra.luz?.impacto, true); // el destello sigue visible
  assert.equal(avisoRitoActual(c), "");

  c.turnoArena = 3;
  c.proximoRito = c.tPelea + 1; // la luz termina antes de probar la siguiente señal
  for (let i = 0; i < 61; i++) paso();
  assert.equal(avisoRitoActual(c), "braseros");
  // Una cobertura en la trayectoria inmediata de cada tiro intercepta la salva.
  c.w.pillars = c.ritos.tiros.map((tiro, i) => ({
    id: `bloquea-${i}`,
    x: tiro.x,
    z: tiro.z,
    r: 0.2,
  }));
  paso();
  assert.ok(c.ritos.tiempo > 3); // todavía queda tiempo del reloj original
  assert.equal(avisoRitoActual(c), "");
});
