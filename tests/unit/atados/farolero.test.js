import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearTienda } from "../../../src/atados/gameplay/tienda.js";
import {
  colocarParaPrueba,
  crearCombate,
  heredarJugadores,
  pasoCombate,
  reintentar,
  saltarPresentacion,
  snapshotCombate,
} from "../../../src/atados/gameplay/combate.js";

const dt = CONFIG.sim.fixedDt;
const quietos = [{}, {}];

function empezar(opciones = {}) {
  const c = crearCombate(CONFIG, { jefe: "farolero", seed: 17, ...opciones });
  saltarPresentacion(c);
  return c;
}

// Avanza igual que en partida con un límite que detecta si quedó trabada una prueba.
function hasta(c, tipo, etapa, entradas = quietos) {
  for (let i = 0; i < 60 * 100; i++) {
    if (c.farolero.tipo === tipo && c.farolero.etapa === etapa) return;
    assert.equal(c.estado, "pelea");
    pasoCombate(c, entradas, dt);
  }
  assert.fail(`El encuentro nunca llegó a ${tipo} / ${etapa}`);
}

const vida = (c) => c.w.players.map((p) => p.hp);

test("el combate final conserva la comida del Puesto 23 y la vida con la que llegó la pareja", () => {
  const tienda = crearTienda(CONFIG);
  for (const producto of ["italiano", "mote", "sopaipilla"]) {
    tienda.acreditar(tienda.cfg.tienda.precios[producto]);
    assert.ok(tienda.comprar(producto, []));
  }
  const c = crearCombate(tienda.cfg, { jefe: "farolero" });
  heredarJugadores(c, [
    { hp: 900, alive: true },
    { hp: 1250, alive: true },
  ]);
  assert.deepEqual(vida(c), [900, 1250]);
  saltarPresentacion(c);
  hasta(c, "campanas", "reto");
  hasta(c, "prisma", "fallo");
  assert.deepEqual(vida(c), [680, 1030]); // 220 de daño por fallar después del ensayo.
  assert.equal(c.w.players[0].hurtT, CONFIG.player.hurtIframes + 0.4);
  const nuevo = reintentar(c);
  assert.deepEqual(vida(nuevo), [1250, 1250]);
  assert.equal(nuevo.cfg.dash.cooldown, CONFIG.dash.cooldown * 0.8);
});

test("la primera vuelta enseña las tres pruebas sin daño ni ataques simultáneos", () => {
  const c = empezar();
  const inicial = vida(c);
  const retos = [];
  for (let i = 0; i < 60 * 100 && c.farolero.vuelta === 1; i++) {
    const f = c.farolero;
    if (f.etapa === "reto" && retos.at(-1) !== f.tipo) retos.push(f.tipo);
    assert.notEqual(c.jefe.accion?.tipo, "ataque");
    assert.equal(c.proyectiles.usados, 0);
    pasoCombate(c, quietos, dt);
  }
  assert.deepEqual(retos, ["prisma", "ecos", "campanas"]);
  assert.equal(c.farolero.vuelta, 2);
  assert.deepEqual(vida(c), inicial);
});

test("el prisma devuelve un golpe al cruzar los eslabones entre dos personajes", () => {
  const c = empezar();
  hasta(c, "prisma", "reto");
  const { x, z } = c.farolero.marcas[0];
  // Un pie sobre el cristal no sustituye un cruce cuando siguen vivos los dos.
  colocarParaPrueba(c, { sael: [x, z], odo: [x + 3, z] });
  pasoCombate(c, quietos, dt);
  assert.equal(c.farolero.etapa, "reto");
  colocarParaPrueba(c, { sael: [x - 3, z], odo: [x + 3, z] });
  const anterior = c.jefe.hp;
  pasoCombate(c, quietos, dt);
  assert.equal(c.farolero.etapa, "acierto");
  assert.ok(c.jefe.hp < anterior);
  const trasAcierto = c.jefe.hp;
  pasoCombate(c, quietos, dt);
  assert.equal(c.jefe.hp, trasAcierto);
});

test("tras el ensayo el eco castiga solo a quien se queda en alguna huella", () => {
  const c = empezar();
  hasta(c, "campanas", "reto");
  hasta(c, "ecos", "reto");
  const [primera] = c.farolero.marcas;
  const fijas = structuredClone(c.farolero.marcas);
  colocarParaPrueba(c, {
    sael: [primera.x, primera.z],
    odo: [primera.x, primera.z - 3.8],
  });
  const inicial = vida(c);
  hasta(c, "ecos", "fallo");
  assert.deepEqual(c.farolero.marcas, fijas);
  assert.ok(c.w.players[0].hp < inicial[0]);
  assert.equal(c.w.players[1].hp, inicial[1]);
});

test("las campanas solo cuentan en orden y un superviviente puede tocar las tres", () => {
  const c = empezar();
  c.w.players[1].alive = false;
  c.w.players[1].hp = 0;
  hasta(c, "campanas", "reto");
  const f = c.farolero;
  function pisar(i) {
    const { x, z } = f.marcas[i];
    colocarParaPrueba(c, { sael: [x, z], odo: [x + 1, z] });
    pasoCombate(c, quietos, dt);
  }
  pisar(2);
  assert.equal(f.paso, 0);
  pisar(0);
  assert.equal(f.paso, 1);
  pisar(0);
  assert.equal(f.paso, 1);
  pisar(1);
  pisar(2);
  assert.equal(f.etapa, "acierto");
});

test("el superviviente puede recoger por sí mismo el prisma", () => {
  const c = empezar();
  hasta(c, "prisma", "reto");
  const { x, z } = c.farolero.marcas[0];
  c.w.players[0].alive = false;
  c.w.players[0].hp = 0;
  colocarParaPrueba(c, { sael: [x + 3, z], odo: [x, z] });
  pasoCombate(c, quietos, dt);
  assert.equal(c.farolero.etapa, "acierto");
});

test("reintentar repone el ensayo y reproduce la posición inicial del prisma", () => {
  const c = empezar();
  hasta(c, "prisma", "reto");
  const inicio = snapshotCombate(c).farolero;
  hasta(c, "campanas", "reto");
  const nuevo = reintentar(c);
  saltarPresentacion(nuevo);
  hasta(nuevo, "prisma", "reto");
  assert.deepEqual(snapshotCombate(nuevo).farolero, inicio);
});

function caminar(jugador, x, z) {
  const dx = x - jugador.x;
  const dz = z - jugador.z;
  const d = Math.hypot(dx, dz);
  return d < 0.12 ? {} : { mx: dx / d, mz: dz / d };
}

// Prueba una partida completa usando únicamente los ejes de movimiento normales.
for (const solo of [false, true]) {
  test(`las tres respuestas llevan a la victoria caminando en ${solo ? "solo" : "cooperativo"}`, () => {
    const c = empezar({ solo });
    const resueltos = new Set();
    let salidaEco;
    let ultimoEco;
    for (let i = 0; i < 60 * 120 && c.estado === "pelea"; i++) {
      const f = c.farolero;
      let entradas = quietos;
      if (f.etapa === "acierto") resueltos.add(f.tipo);
      if (f.etapa === "aviso" || f.etapa === "reto") {
        const marca = f.marcas[f.tipo === "campanas" ? f.paso : 0];
        if (marca && f.tipo === "prisma") {
          // Se colocan a lados opuestos, con seis metros entre ambos.
          entradas = c.w.players.map((p, j) =>
            caminar(p, marca.x + (j === 0 ? -3 : 3), marca.z),
          );
        } else if (marca && f.tipo === "ecos") {
          if (ultimoEco !== f.vuelta) {
            // Escoge un lado libre de las huellas, dentro del borde de la arena.
            const objetivo = { x: 0, z: 0 };
            let margen = -Infinity;
            for (let k = 0; k < 16; k++) {
              const angulo = (k * Math.PI) / 8;
              const x = marca.x + Math.cos(angulo) * 4.5;
              const z = marca.z + Math.sin(angulo) * 4.5;
              const espacio = Math.min(
                c.w.arenaRadius - Math.hypot(x, z),
                Math.hypot(x - c.jefe.x, z - c.jefe.z) - c.jefe.r,
                ...f.marcas.map((m) => Math.hypot(m.x - x, m.z - z) - m.r),
              );
              if (espacio > margen) {
                margen = espacio;
                Object.assign(objetivo, { x, z });
              }
            }
            ultimoEco = f.vuelta;
            salidaEco = objetivo;
          }
          entradas = c.w.players.map((p) =>
            caminar(p, salidaEco.x, salidaEco.z),
          );
        } else if (marca) {
          entradas = c.w.players.map((p) => caminar(p, marca.x, marca.z));
        }
      }
      pasoCombate(c, entradas, dt);
    }
    assert.deepEqual([...resueltos].sort(), ["campanas", "ecos", "prisma"]);
    assert.equal(c.estado, "victoria");
    assert.equal(c.stats.sinDano, true);
  });
}
