// Cámara 3/4 (render/camara.js): el encuadre mete a los dos jugadores y al jefe con el aspecto real de la
// ventana, y la presentación corta respeta el movimiento reducido. Corre en node: three.js calcula matrices
// sin WebGL.
import { describe, it } from "node:test";
import * as THREE from "three";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  crearCamara,
  distanciaEncuadre,
} from "../../../src/atados/render/camara.js";

/**
 * Mundo mínimo que lee la cámara: solo las posiciones de los jugadores (m).
 * @param {number} ax @param {number} az @param {number} bx @param {number} bz
 */
const mundo = (ax, az, bx, bz) => ({
  players: [
    { x: ax, z: az },
    { x: bx, z: bz },
  ],
});

/**
 * Proyecta un punto de mundo a coordenadas normalizadas de pantalla (−1..1 dentro del cuadro).
 * @param {THREE.PerspectiveCamera} cam @param {number} x @param {number} y @param {number} z
 */
function ndc(cam, x, y, z) {
  cam.updateMatrixWorld(true);
  return new THREE.Vector3(x, y, z).project(cam);
}

describe("cámara: encuadre con el aspecto de la ventana", () => {
  it("una ventana estrecha pide más distancia que una ancha para la misma caja", () => {
    const el = (CONFIG.camera.elevationDeg * Math.PI) / 180;
    const ancha = distanciaEncuadre(15, 5, el, CONFIG.view.fov, 16 / 9);
    const estrecha = distanciaEncuadre(15, 5, el, CONFIG.view.fov, 800 / 900);
    expect(estrecha).toBeGreaterThan(ancha);
  });

  it("en 800 × 900 los dos jugadores y Mirra quedan dentro del cuadro (antes Odo salía por la derecha)", () => {
    const cam = crearCamara({ cfg: CONFIG, reducir: () => false });
    cam.resize(800, 900);
    const w = mundo(10, 0, 17, 0); // Sael en (10, 0), Odo en (17, 0)
    const puntos = [-5, 0, 2]; // Mirra en (−5, 0) con 2 m de radio
    for (let f = 0; f < 600; f++) cam.update(w, puntos, 1 / 60, null); // 10 s: cámara estabilizada
    for (const [x, z] of [
      [10, 0],
      [17, 0],
      [-5, 0],
    ])
      for (const y of [0, 1.5]) {
        // pies y cabeza
        const p = ndc(cam.camera, x, y, z);
        expect(Math.abs(p.x), `x=${x} y=${y}`).toBeLessThan(1);
        expect(Math.abs(p.y), `x=${x} y=${y}`).toBeLessThan(1);
      }
  });

  it("al redimensionar a una ventana más estrecha, la cámara se aleja para seguir encuadrando", () => {
    const cam = crearCamara({ cfg: CONFIG, reducir: () => false });
    const w = mundo(-12, 0, 12, 0);
    cam.resize(1600, 900);
    for (let f = 0; f < 600; f++) cam.update(w, [], 1 / 60, null);
    const lejosAncha = cam.camera.position.y;
    cam.resize(600, 900);
    for (let f = 0; f < 600; f++) cam.update(w, [], 1 / 60, null);
    expect(cam.camera.position.y).toBeGreaterThan(lejosAncha);
    expect(Math.abs(ndc(cam.camera, 12, 0, 0).x)).toBeLessThan(1);
    expect(Math.abs(ndc(cam.camera, -12, 0, 0).x)).toBeLessThan(1);
  });
});

describe("cámara: presentación corta del reintento", () => {
  const pres = (/** @type {number} */ k) => ({
    k,
    jx: 0,
    jz: -4,
    face: Math.PI / 2,
    alto: 3,
  });

  it("con movimiento reducido es un plano fijo: no gira ni sube mientras k avanza antes de abrirse", () => {
    const cam = crearCamara({ cfg: CONFIG, reducir: () => true });
    const w = mundo(-2, 4, 2, 4);
    cam.update(w, [], 1 / 60, pres(0));
    const a = cam.camera.position.clone();
    cam.update(w, [], 1 / 60, pres(CONFIG.render.presentacion.entrada * 0.9));
    expect(cam.camera.position.distanceTo(a)).toBeLessThan(1e-6);
  });

  it("sin movimiento reducido sigue girando alrededor del jefe", () => {
    const cam = crearCamara({ cfg: CONFIG, reducir: () => false });
    const w = mundo(-2, 4, 2, 4);
    cam.update(w, [], 1 / 60, pres(0));
    const a = cam.camera.position.clone();
    cam.update(w, [], 1 / 60, pres(CONFIG.render.presentacion.entrada * 0.9));
    expect(cam.camera.position.distanceTo(a)).toBeGreaterThan(0.5);
  });
});
