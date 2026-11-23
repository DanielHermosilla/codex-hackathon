import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  crearRitos,
  iniciarPisoton,
  iniciarBraseros,
  avanzarRitos,
} from "../../../src/atados/gameplay/ritos.js";

function caso(iniciar) {
  const mundo = {
    arenaRadius: 16,
    players: [
      { x: -1, z: 5, px: -1, pz: 5, alive: true },
      { x: 1, z: 5, px: 1, pz: 5, alive: true },
    ],
    dummy: { x: 0, z: 0, r: 1.8 },
    pillars: [],
    cfg: CONFIG,
  };
  const r = crearRitos(),
    golpes = [];
  iniciar(r, mundo);
  const paso = (n) => {
    for (let i = 0; i < n; i++) {
      avanzarRitos(r, mundo, 1 / 60, (id, dano) => {
        assert.equal(dano, iniciar === iniciarPisoton ? 300 : 260);
        golpes.push(id);
      });
      for (const p of mundo.players) {
        p.px = p.x;
        p.pz = p.z;
      }
    }
  };
  return { mundo, r, golpes, paso };
}
test("pisotón pide que ambos estén dentro y juntos en el momento del impacto", () => {
  for (const [separacion, esperado] of [
    [1, []],
    [3, [0, 1]],
  ]) {
    const { mundo, r, golpes, paso } = caso(iniciarPisoton);
    mundo.players.forEach((p, i) =>
      Object.assign(p, { x: r.x + (i - 0.5) * separacion, z: r.z }),
    );
    paso(179);
    assert.deepEqual(golpes, []);
    paso(2);
    assert.deepEqual(golpes, esperado);
  }
  const { mundo, r, golpes, paso } = caso(iniciarPisoton);
  mundo.players.forEach((p) => Object.assign(p, { x: r.x + 4, z: r.z }));
  paso(181);
  assert.deepEqual(golpes, [0, 1]);
});
test("los dos proyectiles impactan a los cuatro segundos y el brasero aparece sin activarse", () => {
  const { mundo, r, golpes, paso } = caso(iniciarBraseros);
  for (const fuego of r.braseros) {
    for (const p of mundo.players) {
      assert.ok(
        Math.hypot(fuego.x - p.x, fuego.z - p.z) >=
          4.5 + 1.15 + mundo.cfg.player.radius,
      );
    }
  }
  paso(239);
  assert.deepEqual(golpes, []);
  assert.equal(r.escudo.color, -1);
  mundo.players[0].x += 0.25; // El proyectil termina donde está el objetivo en el último paso.
  paso(1);
  assert.deepEqual(golpes, [0, 1]);
  assert.deepEqual(r.tiros[0].resolucion, {
    tipo: "impacto",
    x: mundo.players[0].x,
    z: mundo.players[0].z,
  });
});
test("un solo jugador protege a ambos solo durante los tres segundos del fuego", () => {
  for (const [espera, esperado] of [
    [20, [0, 1]],
    [160, []],
  ]) {
    const { mundo, r, golpes, paso } = caso(iniciarBraseros);
    paso(espera);
    mundo.players[1].x = r.braseros[r.colorObjetivo].x;
    mundo.players[1].z = r.braseros[r.colorObjetivo].z;
    paso(1);
    assert.equal(r.escudo.restante, 3);
    paso(239 - espera);
    assert.deepEqual(golpes, esperado);
    assert.deepEqual(
      r.tiros.map((t) => t.resolucion),
      mundo.players.map(({ x, z }) => ({
        tipo: espera === 160 ? "escudo" : "impacto",
        x,
        z,
      })),
    );
  }
});
test("el proyectil interceptado por un obstáculo desaparece", () => {
  const { mundo, r, golpes, paso } = caso(iniciarBraseros);
  const t = r.tiros[0];
  mundo.pillars.push({ x: t.x, z: t.z, r: 0.8 });
  paso(1);
  assert.equal(t.activo, false);
  paso(240);
  assert.deepEqual(golpes, [1]);
});

test("en el paso final el tiro se rompe en el primer borde que cruza", () => {
  const { mundo, r, golpes, paso } = caso(iniciarBraseros);
  r.tiempo = 0.01; // Quedan 10 ms, así que el siguiente paso cierra la salva.
  Object.assign(r.escudo, { color: r.colorObjetivo, restante: 1 });
  Object.assign(r.tiros[0], { x: 0, z: 5 });
  Object.assign(mundo.players[0], { x: 8, z: 5 });
  // El obstáculo que el tiro toca primero figura al final de la lista.
  mundo.pillars.push({ x: 6, z: 5, r: 1 }, { x: 2, z: 5, r: 0.5 });
  paso(1);
  assert.equal(r.tiempo, 0);
  assert.deepEqual(r.tiros[0].resolucion, { tipo: "pilar", x: 1.5, z: 5 });
  assert.equal(r.tiros[1].resolucion.tipo, "escudo");
  assert.deepEqual(golpes, []);
});

test("si el objetivo cae, el tiro se apaga en su posición previa y la próxima salva limpia el resultado", () => {
  const { mundo, r, golpes, paso } = caso(iniciarBraseros);
  paso(60);
  const { x, z } = r.tiros[0];
  mundo.players[0].alive = false;
  paso(180);
  assert.deepEqual(r.tiros[0].resolucion, { tipo: "caida", x, z });
  assert.deepEqual(golpes, [1]);
  iniciarBraseros(r, mundo);
  assert.equal(r.tiros[0].activo, false);
  assert.deepEqual(
    r.tiros.map((t) => t.resolucion),
    [null, null],
  );
});

test("elegir el color incorrecto gasta la elección y no bloquea ninguno de los impactos", () => {
  const { mundo, r, paso, golpes } = caso(iniciarBraseros);
  paso(140);
  const otro = r.braseros[(r.colorObjetivo + 1) % r.braseros.length];
  Object.assign(mundo.players[0], {
    px: otro.x,
    pz: otro.z,
    x: otro.x,
    z: otro.z,
  });
  paso(1);
  const correcto = r.braseros[r.colorObjetivo];
  Object.assign(mundo.players[1], {
    px: correcto.x,
    pz: correcto.z,
    x: correcto.x,
    z: correcto.z,
  });
  paso(99);
  assert.equal(r.escudo.color, otro.color);
  assert.deepEqual(golpes, [0, 1]);
  assert.ok(r.escudo.restante > 0);
  paso(100);
  assert.equal(r.escudo.restante, 0);
});
test("las salvas cambian de color y los braseros quedan separados", () => {
  const { mundo, r } = caso(iniciarBraseros);
  const colores = new Set();
  for (let i = 0; i < r.braseros.length; i++) {
    colores.add(r.colorObjetivo);
    for (let a = 0; a < r.braseros.length; a++)
      for (let b = a + 1; b < r.braseros.length; b++) {
        assert.ok(
          Math.hypot(
            r.braseros[a].x - r.braseros[b].x,
            r.braseros[a].z - r.braseros[b].z,
          ) > 2.3,
        );
      }
    iniciarBraseros(r, mundo);
  }
  assert.equal(colores.size, 3);
});

test("si alguien cae durante el aviso, solo cuenta la posición del superviviente al impacto", () => {
  for (const vivo of [0, 1]) {
    for (const dentro of [true, false]) {
      const { mundo, r, golpes, paso } = caso(iniciarPisoton);
      paso(179);
      Object.assign(mundo.players[1 - vivo], { alive: false, x: r.x + 9 });
      Object.assign(mundo.players[vivo], { x: r.x + (dentro ? 0 : 3), z: r.z });
      paso(1);
      assert.deepEqual(golpes, dentro ? [] : [vivo]);
    }
  }
});
