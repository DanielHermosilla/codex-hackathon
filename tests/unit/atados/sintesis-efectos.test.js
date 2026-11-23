// Sintetizador de efectos (src/atados/audio/sintesis-efectos.js) y catálogo (efectos.js): medidas objetivas.
// No reemplazan la escucha: comprueban lo que sí se puede medir (picos, clics, graves, afinación, tiempos).
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import { planSonido } from "../../../src/atados/audio/reglas.js";
import { crearMotor } from "../../../src/atados/audio/motor.js";
import {
  mezclarPlan,
  renderizarVoz,
  resolverVoz,
  duracionVoz,
} from "../../../src/atados/audio/sintesis-efectos.js";
import { MockAudioContext, sintesisFalsa } from "./audio-mock.js";

const SR = 48000; // muestras por segundo de un equipo típico
const A = CONFIG.audio;
const ids = Object.keys(A.sfx);
// Momentos grandes (suenan en silencios o cambios de fase): pueden tener más cuerpo grave.
const GRANDES = new Set([
  "corteFinal",
  "presentacionGolpe",
  "faseGolpe",
  "mirraMuerte",
  "pisotonGolpe",
]);
// Sonidos que se repiten a menudo: deben ser cortos para no ensuciar la mezcla.
const FRECUENTES = [
  "eslabon1",
  "eslabon2",
  "eslabon3",
  "corte",
  "dash",
  "anclaSuelta",
  "golpeRecibido",
];

const mezclar = (id, dur = null) =>
  mezclarPlan(planSonido(A.sfx[id], dur), id, SR, null);

// Fracción de energía bajo ~120 Hz: dos filtros pasa-bajos de un polo en cascada.
function fraccionGrave(x) {
  const k = 1 - Math.exp((-2 * Math.PI * 120) / SR);
  let a = 0,
    b = 0,
    grave = 0,
    total = 0;
  for (const v of x) {
    a += k * (v - a);
    b += k * (a - b);
    grave += b * b;
    total += v * v;
  }
  return grave / (total || 1);
}

describe("sintetizador de efectos", () => {
  it("es determinista: la misma voz y semilla dan las mismas muestras", () => {
    const v = resolverVoz({
      voz: "ruido",
      desde: 800,
      hasta: 2400,
      soltar: 0.2,
      chispas: { porSeg: 80, caida: 0.01 },
    });
    expect([...renderizarVoz(v, SR, 7)]).toEqual([...renderizarVoz(v, SR, 7)]);
    const otra = renderizarVoz(v, SR, 8);
    const igual = renderizarVoz(v, SR, 7);
    expect(otra.some((x, k) => x !== igual[k])).toBe(true); // otra semilla, otro ruido
  });
  it("cada voz dura lo que dice su envolvente", () => {
    for (const voz of ["tono", "metal", "cuerda", "ruido", "golpe"]) {
      const v = resolverVoz({ voz, frecuencia: 440, soltar: 0.3 });
      expect(renderizarVoz(v, SR, 1).length, voz).toBe(
        Math.ceil(duracionVoz(v) * SR),
      );
    }
  });
  it("todos los efectos: sin saturación, sin valores rotos y sin clic al empezar ni al terminar", () => {
    for (const id of ids) {
      const x = mezclar(id, 1);
      let pico = 0;
      for (const v of x) {
        expect(Number.isFinite(v), id).toBe(true);
        pico = Math.max(pico, Math.abs(v));
      }
      expect(pico, id).toBeLessThanOrEqual(1);
      expect(pico, id).toBeGreaterThan(0.05); // se oye
      expect(Math.abs(x[0]), id).toBeLessThan(0.05);
      // El enjambre es un bucle: su final empalma con su inicio en lugar de apagarse.
      if (id !== "mirraEnjambre")
        expect(Math.abs(x.at(-1)), id).toBeLessThan(0.01);
    }
  });
  it("el enjambre en bucle mide 1 s exacto y no lleva cola de sala (empalma sin hueco)", () => {
    const plan = planSonido(A.sfx.mirraEnjambre);
    expect(plan.cuerpo).toBeCloseTo(1, 5);
    expect(plan.largo).toBeCloseTo(1, 5);
  });
  it("los graves quedan para la música: poca energía bajo 120 Hz", () => {
    for (const id of ids) {
      const limite = GRANDES.has(id) ? 0.3 : 0.06;
      expect(fraccionGrave(mezclar(id, 1)), id).toBeLessThan(limite);
    }
  });
  it("los sonidos frecuentes son breves", () => {
    for (const id of FRECUENTES)
      expect(planSonido(A.sfx[id]).cuerpo, id).toBeLessThan(0.4);
  });
  it("los motivos afinados usan notas de do menor (tema de fase 2) y no cambian de tono entre jugadores", () => {
    const doMenor = new Set([0, 2, 3, 5, 7, 8, 10]); // do re mib fa sol lab sib
    for (const [id, def] of Object.entries(A.sfx)) {
      if (!def.tonoFijo) continue;
      for (const c of def.capas)
        if (c.voz === "tono" || c.voz === "cuerda") {
          const clase =
            ((Math.round(12 * Math.log2(c.frecuencia / 261.63)) % 12) + 12) %
            12;
          expect(doMenor.has(clase), `${id} ${c.frecuencia}`).toBe(true);
        }
    }
  });
  it("el motor respeta `tonoFijo`: revivir no se desafina con el tono de Sael; el dash sí cambia", async () => {
    const m = crearMotor({
      cfg: CONFIG,
      crearContexto: () => new MockAudioContext(),
      cargarSintesis: sintesisFalsa,
    });
    await m.desbloquear();
    expect(m.sonar("revivir", { tono: 1.12 }).src.playbackRate.value).toBe(1);
    expect(m.sonar("dash", { tono: 1.12 }).src.playbackRate.value).toBe(1.12);
    m.dispose();
  });
});
