import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  colocarParaPrueba,
  crearCombate,
  forzarAtaque,
  pasoCombate,
  sinAtaques,
} from "../../../src/atados/gameplay/combate.js";
import { dentroZona } from "../../../src/atados/gameplay/bloques.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";

const dt = CONFIG.sim.fixedDt;

/** @param {string} id @param {Parameters<typeof colocarParaPrueba>[1]} pos */
function preparar(id, pos = { jefe: [0, -9], sael: [0, 1], odo: [4, 1] }) {
  const cfg = structuredClone(CONFIG);
  cfg.feedback.hitstop.enabled = false; // cada paso avanza 1/60 s de juego
  cfg.damage.chain.scale = 0; // ninguna cadena altera la acción que estamos midiendo
  const c = crearCombate(cfg, { seed: 1 });
  c.w.pillars = []; // evita que una cobertura cambie el ataque fijado por la prueba
  sinAtaques(c); // solo corre el ataque que se fuerce en este caso
  colocarParaPrueba(c, pos);
  const a = forzarAtaque(c, id);
  const quietos = [emptyInput(), emptyInput()];
  /** @param {number} [n] cantidad de pasos de simulación */
  const paso = (n = 1) => {
    for (let i = 0; i < n; i++) pasoCombate(c, quietos, dt);
  };
  const golpes = () => c.eventos.filter((e) => e.tipo === "golpe_jugador");
  return { c, a, paso, golpes };
}

for (const id of ["siega", "siega_doble"]) {
  test(`${id}: el sector va del aviso al inicio del filo y golpea al pasar`, () => {
    const { a, paso, golpes } = preparar(id, {
      jefe: [0, 0],
      sael: [4, 0], // centro del arco, a cuatro metros
      odo: [11, 0], // fuera del sector de 10,5 m
    });
    const [z] = a.bloques[0].zonas;
    assert.equal(z.forma, "sector");
    assert.equal(z.etapa, "aviso");
    paso(Math.round(a.T / dt));
    assert.equal(z.etapa, "activa");
    assert.equal(z.progreso, 0); // el filo todavía no recorrió el arco
    assert.equal(golpes().length, 0);
    paso(7);
    assert.ok(z.progreso > 0.5);
    assert.deepEqual(
      golpes().map((g) => [g.jugador, g.dano]),
      [[0, 200]],
    );
    if (id === "siega_doble") {
      paso(6); // se termina el primer recorrido y reaparece el aviso
      assert.equal(z.etapa, "aviso");
      assert.equal(z.sentido, -1);
      for (let i = 0; i < 60 && z.etapa === "aviso"; i++) paso();
      assert.equal(z.etapa, "activa");
      assert.equal(z.progreso, 0);
      paso(7);
      assert.deepEqual(
        golpes().map((g) => [g.jugador, g.dano]),
        [
          [0, 200],
          [0, 200],
        ],
      );
    }
  });
}

test("Grano: las semillas vuelan hacia las marcas y el suelo daña al caer", () => {
  const { c, a, paso, golpes } = preparar("grano");
  const { zonas, salida } = a.bloques[0];
  const proyectiles = c.proyectiles.items.filter((p) => p.activo);
  assert.equal(zonas.length, 5);
  assert.deepEqual(
    proyectiles.map((p) => [p.x1, p.z1]),
    zonas.map((z) => [z.x, z.z]),
  );
  assert.ok(proyectiles.every((p) => p.t === -1)); // listos, aún sin vuelo visible
  paso(54); // 0,9 s: quedan 0,5 s de aviso y la semilla ya viaja
  assert.ok(proyectiles.every((p) => p.t > 0 && p.t < 1));
  const [impacto] = zonas;
  assert.ok(salida);
  colocarParaPrueba(c, {
    sael: [impacto.x, impacto.z],
    odo: [salida.x, salida.z], // hueco seguro entre círculos
  });
  assert.equal(golpes().length, 0);
  paso(Math.round((a.T - a.t) / dt) + 1);
  assert.ok(zonas.every((z) => z.etapa === "activa"));
  assert.equal(c.proyectiles.usados, 0); // las semillas ya llegaron a su marca
  assert.deepEqual(
    golpes().map((g) => [g.ataque, g.jugador, g.dano]),
    [["grano", 0, 150]],
  );
});

test("Hambre: el frente de la marca avanza con el cuerpo y solo golpea dentro del carril", () => {
  const { c, a, paso, golpes } = preparar("hambre");
  const [z] = a.bloques[0].zonas;
  assert.equal(z.forma, "rect");
  assert.equal(z.etapa, "aviso");
  paso(Math.round(a.T / dt) + 2);
  assert.equal(z.etapa, "activa");
  const frente = z.frente;
  paso(10);
  assert.ok(z.frente > frente && z.atras > 0);
  assert.equal(golpes().length, 0); // el frente todavía no llega a Sael
  paso(30);
  assert.deepEqual(
    golpes().map((g) => [g.ataque, g.jugador, g.dano]),
    [["hambre", 0, 250]],
  );
  assert.equal(c.w.players[1].hp, c.cfg.player.maxHp); // Odo espera al margen
});

test("Enjambre: el círculo persigue a su objetivo y los golpes requieren tiempo dentro", () => {
  const { c, a, paso, golpes } = preparar("enjambre");
  const [z] = a.bloques[0].zonas;
  const inicio = z.z;
  assert.equal(z.etapa, "aviso");
  paso(Math.round(a.T / dt));
  assert.equal(z.z, inicio); // durante el aviso la nube se forma en Mirra
  assert.equal(z.etapa, "activa");
  paso(1);
  assert.ok(z.z > inicio);
  const [sael] = c.w.players;
  assert.equal(dentroZona(sael.x, sael.z, z), false);
  for (let i = 0; i < 120 && !dentroZona(sael.x, sael.z, z); i++) paso();
  assert.equal(dentroZona(sael.x, sael.z, z), true);
  paso(28); // 29 pasos dentro, todavía falta uno para cumplir 0,5 s
  assert.equal(golpes().length, 0);
  paso();
  assert.deepEqual(
    golpes().map((g) => [g.ataque, g.jugador, g.dano]),
    [["enjambre", 0, 50]],
  );
});

test("Banquete: el tirón avisa antes de pintar el círculo y la mordida daña al activarse", () => {
  const { c, a, paso, golpes } = preparar("banquete", {
    jefe: [0, 0],
    sael: [3, 0],
    odo: [8, 0],
  });
  const [tiron, mordida] = a.bloques;
  const [z] = mordida.zonas;
  assert.equal(tiron.tirando, true);
  assert.equal(z.etapa, "espera"); // la mordida tiene un aviso propio más corto
  paso(Math.ceil(mordida.inicioAviso / dt));
  assert.equal(z.etapa, "aviso");
  assert.equal(z.x, c.jefe.x);
  assert.ok(c.w.players[0].x < 3); // el tirón ya desplazó a Sael
  assert.equal(golpes().length, 0);
  paso(Math.round((a.T - a.t) / dt));
  assert.equal(tiron.tirando, false);
  assert.equal(z.etapa, "activa");
  paso();
  assert.ok(
    golpes().some(
      (g) => g.ataque === "banquete" && g.jugador === 0 && g.dano === 300,
    ),
  );
});
