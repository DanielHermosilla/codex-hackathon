import assert from "node:assert/strict";
import { test } from "node:test";
import { move, TRACK_SIZE } from "../../src/movement.js";

test("sin dirección conserva la posición", () => {
  // Probamos desde una posición distinta del centro para detectar un reinicio involuntario.
  const position = { x: 1, z: -2 };
  move(position, 0, 0, 0.5);
  assert.deepEqual(position, { x: 1, z: -2 });
});

test("el tiempo transcurrido controla la distancia", () => {
  const position = { x: 0, z: 0 };
  // A cinco unidades por segundo, medio segundo equivale a 2,5 unidades.
  move(position, -1, 0, 0.5);
  assert.deepEqual(position, { x: -2.5, z: 0 });
});

test("la diagonal conserva la velocidad", () => {
  const position = { x: 0, z: 0 };
  move(position, 1, -1, 0.2);
  // La longitud total debe ser 1, con tolerancia para el redondeo decimal.
  assert.ok(Math.abs(Math.hypot(position.x, position.z) - 1) < 1e-10);
  assert.ok(position.x > 0 && position.z < 0);
});

test("el cubo queda dentro de la pista aunque el movimiento cruce el borde", () => {
  const position = { x: 0, z: 0 };
  // Una duración larga obliga a acotar la posición en ambos ejes.
  move(position, 1, -1, 10);
  const edge = TRACK_SIZE / 2 - 0.75;
  assert.deepEqual(position, { x: edge, z: -edge });
});
