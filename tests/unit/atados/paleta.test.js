import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  mezclarHex,
  mezclaPaleta,
  resolverPaleta,
} from "../../../src/atados/render/paleta.js";

describe("paleta (propuesta D-083)", () => {
  it("mezclarHex respeta extremos y punto medio", () => {
    expect(mezclarHex(0x000000, 0xffffff, 0)).toBe(0x000000);
    expect(mezclarHex(0x000000, 0xffffff, 1)).toBe(0xffffff);
    expect(mezclarHex(0x000000, 0x0000ff, 0.5)).toBe(0x000080);
  });
  it("la mezcla va de 0 a 1 con fase e intensidad", () => {
    expect(mezclaPaleta("arena", { fase: 1, intensidad: 0 })).toBe(0);
    expect(mezclaPaleta("arena", { fase: 3, intensidad: 1 })).toBe(1);
    expect(mezclaPaleta("pasillo", { progreso: 0.4 })).toBeCloseTo(0.4);
  });
  it("cada zona tiene base y clímax con las mismas claves", () => {
    for (const [nombre, z] of Object.entries(CONFIG.paleta.zonas)) {
      expect(Object.keys(z.climax).sort(), nombre).toEqual(
        Object.keys(z.base).sort(),
      );
      const p = resolverPaleta(nombre, { progreso: 0.5, fase: 2 });
      for (const v of Object.values(p))
        if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
    }
  });
});
