import test from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../../../src/atados/core/config.js";
import { cambiarTecla } from "../../../src/atados/core/preferencias.js";

test("la esquiva compartida sigue a Sael y la esquiva de Odo es independiente", () => {
  const mapa = structuredClone(CONFIG.controls.keyboard);
  assert.equal(cambiarTecla(mapa, "sael", "dash", "KeyF"), "");
  assert.deepEqual(mapa.soloDash, ["KeyF"]);
  assert.equal(cambiarTecla(mapa, "odo", "dash", "Space"), "");
  assert.deepEqual(mapa.odo.dash, ["Space"]);
  assert.deepEqual(mapa.soloDash, ["KeyF"]);
});

test("respeta las teclas de la tienda y los dos Intro del ancla", () => {
  const mapa = structuredClone(CONFIG.controls.keyboard);
  assert.equal(cambiarTecla(mapa, "odo", "left", "KeyP"), "reservada");
  assert.equal(cambiarTecla(mapa, "odo", "left", "NumpadEnter"), "ocupada");
  assert.equal(mapa.odo.left, "ArrowLeft");
  assert.equal(cambiarTecla(mapa, "odo", "anchor", "KeyJ"), "");
  assert.equal(cambiarTecla(mapa, "odo", "anchor", "Enter"), "");
  assert.deepEqual(mapa.odo.anchor, ["Enter", "NumpadEnter"]);
});
