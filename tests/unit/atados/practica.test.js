// Práctica con el muñeco de paja: es un jefe de datos sin ataques que enseña el corte con la cadena tensa.
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  crearCombate,
  pasoCombate,
  saltarPresentacion,
} from "../../../src/atados/gameplay/combate.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";

const dt = CONFIG.sim.fixedDt;

/** Combate de práctica listo para jugar (sin presentación). */
function practica(solo = true) {
  const c = crearCombate(CONFIG, { jefe: "muneco", solo, seed: 7 });
  saltarPresentacion(c);
  return c;
}

/** Avanza `n` pasos con la misma entrada para Sael (a) y Odo (b). */
function correr(c, a, b, n) {
  const ins = [emptyInput(), emptyInput()];
  for (let i = 0; i < n; i++) {
    Object.assign(ins[0], a);
    Object.assign(ins[1], b);
    pasoCombate(c, ins, dt);
  }
}

describe("práctica con el muñeco", () => {
  it("nunca ataca ni se mueve", () => {
    const c = practica();
    correr(c, {}, {}, 60 * 20);
    expect(c.jefe.ataques).toBe(0);
    expect(c.jefe.x).toBe(0);
    expect(c.w.players.every((p) => p.alive)).toBe(true);
  });

  it("un barrido tenso le quita vida y uno flojo casi nada", () => {
    const tenso = practica();
    correr(tenso, { mx: -1 }, { mx: 1 }, 50);
    correr(tenso, { mx: -0.5, mz: -1 }, { mx: 0.5, mz: -1 }, 120);
    const quitado = tenso.jefe.hpMax - tenso.jefe.hp;
    expect(quitado).toBeGreaterThan(80); // ×10 (D-202)

    const flojo = practica();
    correr(flojo, { mz: -1 }, { mz: -1 }, 120);
    expect(flojo.jefe.hpMax - flojo.jefe.hp).toBeLessThan(quitado * 0.1);
  });

  it("la proporción daño de una pasada tensa / vida del muñeco no cambia con la escala ×10 (D-202)", () => {
    // Mismo guion con los números de antes de D-202 (todo ÷10) y con los actuales: la fracción de vida quitada es igual.
    const fraccion = (cfg) => {
      const c = crearCombate(cfg, { jefe: "muneco", solo: true, seed: 7 });
      saltarPresentacion(c);
      correr(c, { mx: -1 }, { mx: 1 }, 50);
      correr(c, { mx: -0.5, mz: -1 }, { mx: 0.5, mz: -1 }, 120);
      return (c.jefe.hpMax - c.jefe.hp) / c.jefe.hpMax;
    };
    const antes = structuredClone(CONFIG);
    antes.player.maxHp /= 10;
    antes.damage.chain.scale /= 10;
    antes.jefes.muneco.vida /= 10;
    expect(CONFIG.damage.chain.scale).toBe(70);
    expect(CONFIG.jefes.muneco.vida).toBe(600);
    const ahora = fraccion(CONFIG);
    expect(ahora).toBeGreaterThan(0.05);
    expect(ahora).toBeCloseTo(fraccion(antes), 6);
  });

  it("se gana en pocas pasadas", () => {
    const c = practica();
    // Ida y vuelta: cada cruce corta el muñeco con la cadena tensa.
    for (let pasada = 0; pasada < 8 && c.estado !== "victoria"; pasada++) {
      const dz = pasada % 2 === 0 ? -1 : 1;
      correr(c, { mx: -1 }, { mx: 1 }, 30);
      correr(c, { mx: -0.5, mz: dz }, { mx: 0.5, mz: dz }, 120);
    }
    expect(c.estado).toBe("victoria");
  });
});
