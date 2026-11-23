// Pradera de la cima (render/trigal.js): el trigo de fuera se apoya en la malla del suelo que se dibuja (no
// flota junto al risco ni crece en la roca) y el fondo del valle conserva sus parcelas. Corre en node: solo
// geometría y colores, sin WebGL.
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as THREE from "three";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  crearTrigal,
  alturaCimaDe,
  alturaMallaDe,
  sembrarFuera,
  geoValle,
  pintarValle,
} from "../../../src/atados/render/trigal.js";

import { crearCombate } from "../../../src/atados/gameplay/combate.js";

const T = CONFIG.render.trigal;
const C = T.cima;
const R = 21; // m: arena de Mirra de 3 L (D-201)

/** La misma malla de suelo que arma el trigal, con su altura por vértice. */
function malla() {
  const altura = alturaCimaDe(R, C);
  const g = new THREE.PlaneGeometry(
    C.suelo.tam,
    C.suelo.tam,
    C.suelo.segmentos,
    C.suelo.segmentos,
  );
  g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i),
      z = pos.getZ(i);
    pos.setY(i, altura(x, z, Math.hypot(x, z)));
  }
  return { g, altura };
}

describe("trigal de la cima: siembra sobre la meseta", () => {
  it("la altura de malla coincide con los triángulos que se dibujan", () => {
    const { g, altura } = malla();
    const alturaMalla = alturaMallaDe(altura, C.suelo.tam, C.suelo.segmentos);
    const pos = g.attributes.position;
    const idx = /** @type {THREE.BufferAttribute} */ (g.index);
    // Centroide de cada triángulo cerca del risco: la altura interpolada debe ser la media de sus vértices.
    let probados = 0;
    for (let f = 0; f < idx.count; f += 3) {
      const a = idx.getX(f),
        b = idx.getX(f + 1),
        c = idx.getX(f + 2);
      const cx = (pos.getX(a) + pos.getX(b) + pos.getX(c)) / 3,
        cz = (pos.getZ(a) + pos.getZ(b) + pos.getZ(c)) / 3;
      const d = Math.hypot(cx, cz);
      if (d < R + 4 || d > R + C.borde + 6) continue;
      const cy = (pos.getY(a) + pos.getY(b) + pos.getY(c)) / 3;
      expect(alturaMalla(cx, cz)).toBeCloseTo(cy, 4);
      probados++;
    }
    expect(probados).toBeGreaterThan(100);
  });

  it("ninguna mata flota ni se hunde respecto del suelo dibujado, y ninguna crece en la roca", () => {
    const { altura } = malla();
    const alturaMalla = alturaMallaDe(altura, C.suelo.tam, C.suelo.segmentos);
    const s = sembrarFuera(T, R, alturaMalla);
    const n = s.length / 4;
    expect(n).toBeGreaterThan(T.fuera.matas * 0.9); // casi todas encuentran sitio
    let lejosDeLaPlana = 0; // matas que la altura fija de antes (−0,02 m) dejaba a más de medio metro
    for (let k = 0; k < s.length; k += 4) {
      const x = s[k],
        y = s[k + 1],
        z = s[k + 2];
      expect(y).toBeCloseTo(alturaMalla(x, z), 4);
      expect(y).toBeGreaterThanOrEqual(C.roca);
      expect(Math.hypot(x, z)).toBeGreaterThan(R);
      if (Math.abs(y + 0.02) > 0.5) lejosDeLaPlana++;
    }
    expect(lejosDeLaPlana).toBeLessThan(n); // la siembra sigue al terreno (no todas en el mismo plano)
  });
});

describe("fondo del valle: parcelas y bruma", () => {
  it("el centro conserva varias parcelas y solo el borde se funde con la niebla", () => {
    const geo = geoValle(C.valle, -46);
    const cA = new THREE.Color(0x00ff00),
      cB = new THREE.Color(0x0000ff),
      cN = new THREE.Color(0xff0000),
      cTmp = new THREE.Color();
    pintarValle(geo, cA, cB, cN, cTmp);
    const pos = geo.attributes.position,
      col = geo.attributes.color;
    const tonos = new Set();
    for (let i = 0; i < pos.count; i++) {
      const r = Math.hypot(pos.getX(i), pos.getZ(i));
      if (r < 70) {
        // Dentro de 70 m no hay niebla: nada de rojo y un tono por parcela.
        expect(col.getX(i)).toBeCloseTo(0, 4);
        tonos.add(col.getY(i).toFixed(3));
      }
      if (r > 185) expect(col.getX(i)).toBeCloseTo(1, 4); // el borde ya es niebla
    }
    expect(tonos.size).toBeGreaterThan(5);
  });

  it("los tres vértices de una cara comparten parcela aunque el fundido vaya por vértice", () => {
    const geo = geoValle(C.valle, -46);
    const cA = new THREE.Color(0x00ff00),
      cB = new THREE.Color(0x0000ff),
      cN = new THREE.Color(0x00ff00), // niebla del mismo verde: solo se ve la parcela en el azul
      cTmp = new THREE.Color();
    pintarValle(geo, cA, cB, cN, cTmp);
    const pos = geo.attributes.position,
      col = geo.attributes.color;
    for (let f = 0; f < pos.count; f += 3) {
      const r = Math.max(
        ...[0, 1, 2].map((j) => Math.hypot(pos.getX(f + j), pos.getZ(f + j))),
      );
      if (r > 70) continue; // sin niebla: el azul es la parcela pura
      expect(col.getZ(f + 1)).toBeCloseTo(col.getZ(f), 5);
      expect(col.getZ(f + 2)).toBeCloseTo(col.getZ(f), 5);
    }
  });
});

it("cuatro de los ocho pilares de Mirra llevan el grabado y cada uno se lo lleva al desaparecer", (t) => {
  // En Node no hay imágenes del DOM. La escena y las matrices sí son las del juego.
  t.mock.method(
    THREE.TextureLoader.prototype,
    "load",
    () => new THREE.Texture(),
  );
  const modelo = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.72, 1.6, 8).translate(0, 0.8, 0),
    new THREE.MeshBasicMaterial(),
  );
  for (const jefe of ["mirra", "muneco"]) {
    const c = crearCombate(CONFIG, { jefe });
    const scene = new THREE.Scene();
    const trigal = crearTrigal({
      scene,
      cfg: CONFIG,
      keep: (o) => o,
      modelos: { espantapajaros: { scene: modelo } },
      world0: c.w,
      jefe0: c.jefe,
    });
    trigal.sync(c.w, c, 1 / 60, 0);
    const tallas = scene.getObjectsByProperty("name", "talla-codex");
    assert.equal(tallas.length, jefe === "mirra" ? c.w.pillars.length / 2 : 0);
    if (jefe === "mirra") {
      for (const id of [4, 5, 6, 7]) {
        const pilar = c.w.pillars.find((p) => p.id === id);
        const talla =
          /** @type {THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>} */ (
            tallas.find(
              (m) =>
                m.visible &&
                m.matrix.elements[12] === pilar.x &&
                m.matrix.elements[14] === pilar.z,
            )
          );
        assert.ok(talla, `Falta el grabado del pilar ${id}`);
        assert.equal(talla.material.transparent, true); // El fondo conserva la paja.
        assert.ok(talla.geometry.attributes.position.count > 0); // La proyección toca el poste.
        c.w.pillars = c.w.pillars.filter((p) => p !== pilar);
        trigal.sync(c.w, c, 0.45, 0.45); // A medio vuelo el grabado sigue al pilar.
        assert.equal(talla.visible, true);
        assert.notEqual(talla.matrix.elements[12], pilar.x);
        trigal.sync(c.w, c, 0.45, 0.9);
        assert.equal(talla.visible, false);
      }
    }
    trigal.dispose();
  }
});
