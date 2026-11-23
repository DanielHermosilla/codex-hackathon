import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearJuego } from "../../../src/atados/core/juego.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";

const DT = CONFIG.sim.fixedDt;

// Entrada simulada: un toque = dash true con dashDown false; se consume al muestrear (como input.js).
function fuente() {
  const st = { inputs: [emptyInput(), emptyInput()], debug: [] };
  return {
    st,
    sample: () => {
      const r = { inputs: st.inputs.map((x) => ({ ...x })), debug: st.debug };
      for (const x of st.inputs) if (x.dashDown === false) x.dash = false;
      return r;
    },
  };
}

describe("bucle de paso fijo (regla 5)", () => {
  it("un toque de dash en un frame sin paso no se pierde", () => {
    const f = fuente();
    const j = crearJuego(structuredClone(CONFIG), { sample: f.sample });
    f.st.inputs[0] = { ...emptyInput(), dash: true, dashDown: false };
    expect(j.update(DT * 0.4)).toBe(0); // frame corto: no simula
    expect(j.update(DT * 0.7)).toBe(1);
    expect(j.world.players[0].dashT).toBeGreaterThan(0);
  });

  it("un toque durante el hit-stop se procesa al terminar", () => {
    const f = fuente();
    const j = crearJuego(structuredClone(CONFIG), { sample: f.sample });
    j.world.hitstop = DT * 2.5;
    f.st.inputs[1] = { ...emptyInput(), dash: true, dashDown: false };
    j.update(DT);
    expect(j.world.players[1].dashT).toBe(0);
    for (let i = 0; i < 3; i++) j.update(DT);
    expect(j.world.players[1].dashT).toBeGreaterThan(0);
  });

  it("mantener el botón no repite el dash; un dt enorme se recorta", () => {
    const cfg = structuredClone(CONFIG);
    const f = fuente();
    const j = crearJuego(cfg, { sample: f.sample });
    f.st.inputs[0] = { ...emptyInput(), dash: true, dashDown: true };
    j.update(DT);
    let dashes = 0,
      prev = j.world.players[0].dashT;
    for (let i = 0; i < 120; i++) {
      j.update(DT);
      const d = j.world.players[0].dashT;
      if (d > prev + 1e-9) dashes++;
      prev = d;
    }
    expect(dashes).toBe(0);
    expect(j.update(10)).toBeLessThanOrEqual(cfg.sim.maxStepsPerFrame);
  });
});
