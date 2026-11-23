// Altura visual del suelo del recorrido (D-210): rampas y peldaños solo en el dibujo.
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  alturaRuta,
  bordesEscalones,
  crearAlturaSuelo,
} from "../../../src/atados/render/altura.js";
import { crearRuta, puntoRuta } from "../../../src/atados/gameplay/ruta.js";

// Ruta recta hacia −z de 100 m: s = −z, d = x. Un tramo de 5 peldaños y una rampa.
const PRUEBA = {
  recorrido: {
    pasillo: {
      ruta: [
        [0, 0],
        [0, -100],
      ],
      ancho: 10,
    },
    altura: [
      { s0: 10, s1: 20, sube: 2, escalones: 5 },
      { s0: 40, s1: 60, sube: 4 },
    ],
  },
  render: { templo: { bordeEscalones: 2 } },
};
const tramos = PRUEBA.recorrido.altura;

describe("altura del suelo (D-210)", () => {
  it("rampa lineal y peldaños iguales sobre el eje", () => {
    expect(alturaRuta(tramos, 0)).toBe(0);
    expect(alturaRuta(tramos, 10)).toBe(0); // justo en s0 aún no sube
    expect(alturaRuta(tramos, 10.5)).toBeCloseTo(0.4, 6); // primer peldaño: 2 / 5
    expect(alturaRuta(tramos, 11.9)).toBeCloseTo(0.4, 6);
    expect(alturaRuta(tramos, 12.1)).toBeCloseTo(0.8, 6); // segundo peldaño
    expect(alturaRuta(tramos, 19.99)).toBeCloseTo(2, 6);
    expect(alturaRuta(tramos, 30)).toBe(2);
    expect(alturaRuta(tramos, 50)).toBeCloseTo(4, 6); // mitad de la rampa: 2 + 4 / 2
    expect(alturaRuta(tramos, 80)).toBe(6);
    expect(alturaRuta(tramos, 15, true)).toBeCloseTo(1, 6); // liso: los peldaños como rampa
  });

  it("los bordes de peldaño caen donde sube la altura", () => {
    const bordes = bordesEscalones(tramos);
    expect(bordes).toHaveLength(5);
    for (const b of bordes) {
      expect(alturaRuta(tramos, b + 1e-6)).toBeGreaterThan(
        alturaRuta(tramos, b - 1e-6) + 0.39,
      );
    }
  });

  it("lobby a 0 y continua por fuera del pasillo", () => {
    const h = crearAlturaSuelo(PRUEBA);
    expect(h(0, 5)).toBe(0); // antes del inicio de la ruta
    expect(h(3, -15)).toBeCloseTo(alturaRuta(tramos, 15), 6); // dentro: peldaño
    // Fuera (a más de ancho/2 + borde del eje) los peldaños ya son rampa lisa.
    expect(h(8, -15)).toBeCloseTo(alturaRuta(tramos, 15, true), 6);
    // Barrido lateral cruzando el borde: sin saltos.
    let prev = h(0, -12.5);
    for (let x = 0; x <= 12; x += 0.05) {
      const v = h(x, -12.5);
      expect(Math.abs(v - prev)).toBeLessThan(0.05);
      prev = v;
    }
  });

  it("con el CONFIG real: spawn y muñeco en el suelo del lobby, cima arriba", () => {
    const h = crearAlturaSuelo(CONFIG);
    const L = CONFIG.recorrido.lobby;
    expect(h(L.spawn.sael[0], L.spawn.sael[1])).toBe(0);
    expect(h(L.spawn.odo[0], L.spawn.odo[1])).toBe(0);
    expect(h(L.muneco.x, L.muneco.z)).toBe(0);
    const P = CONFIG.recorrido.pasillo;
    const ruta = crearRuta(P.ruta, P.ancho);
    const total = CONFIG.recorrido.altura.reduce((a, t) => a + t.sube, 0);
    const fin = puntoRuta(ruta, ruta.total);
    expect(h(fin.x, fin.z)).toBeCloseTo(total, 6);
    // La subida nunca baja a lo largo del eje.
    let prev = 0;
    for (let s = 0; s <= ruta.total; s += 0.5) {
      const q = puntoRuta(ruta, s);
      const v = h(q.x, q.z);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
  });
});
