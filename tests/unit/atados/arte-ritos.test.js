// Contrastamos las señales que se dibujan con la posición y el radio definidos por el combate.
import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { crearArenaMirra } from "../../../src/atados/gameplay/arena-mirra.js";
import { BRASEROS, crearRitos } from "../../../src/atados/gameplay/ritos.js";
import { crearArenaMirraVisual } from "../../../src/atados/render/arena-mirra.js";
import { crearBrillos } from "../../../src/atados/render/brillos.js";
import { crearVistaRitos } from "../../../src/atados/render/ritos.js";

const keep = (recurso) => recurso; // las pruebas recorren las mallas sin montar un contexto WebGL
function visibles(scene) {
  const mallas = [];
  scene.traverseVisible((objeto) => {
    if (objeto.isMesh || objeto.isSprite) mallas.push(objeto);
  });
  return mallas;
}

it("el vacío tiene el radio del daño y la luz divina usa la cobertura real; al reintentar desaparecen", () => {
  const scene = new THREE.Scene();
  const vista = crearArenaMirraVisual({
    scene,
    keep,
    brillos: crearBrillos(keep),
  });
  const w = {
    time: 6,
    arenaRadius: 21,
    pillars: [
      { id: "cobertura", x: 1, z: 2, r: 0.8 },
      { id: "pilar-void", x: 3, z: 4, r: 0.72 },
    ],
  };
  const c = { estado: "pelea", arenaMirra: crearArenaMirra() };
  c.arenaMirra.huecos.push({ x: 3, z: 5, r: 1.2 });
  c.arenaMirra.luz = { x: -5, z: 7, t: 1, impacto: false };
  vista.sync(w, c, false);
  const terreno = visibles(scene).filter(
    (m) => m.geometry.type === "CircleGeometry",
  );
  const pozo = terreno.find((m) => !m.material.transparent);
  const luz = terreno.find((m) => m.material.transparent);
  const posicion = pozo.getWorldPosition(new THREE.Vector3());
  assert.deepEqual(
    [posicion.x, posicion.z, pozo.getWorldScale(new THREE.Vector3()).x],
    [3, 5, 1.2],
  );
  const u = luz.material.uniforms;
  assert.deepEqual(u.foco.value.toArray(), [-5, 7]);
  assert.equal(u.cantidad.value, 1);
  assert.deepEqual(u.piedras.value[0].toArray(), [1, 2, 0.8]);
  c.arenaMirra = crearArenaMirra();
  c.estado = "presentacion";
  vista.sync(w, c, true);
  assert.equal(visibles(scene).length, 0);
});

it("el pisotón marca la posición segura y los tres braseros se muestran con sus colores hasta salir de la arena", () => {
  const scene = new THREE.Scene(),
    jefe = { x: 2, z: -5 };
  const sync = crearVistaRitos(scene, keep, crearBrillos(keep));
  const rito = crearRitos();
  Object.assign(rito, { tipo: "pisoton", x: 2, z: 4, tiempo: 1 });
  sync(rito, 1 / 60, false, jefe);
  const marcas = visibles(scene).filter(
    (m) => m.geometry.type === "RingGeometry",
  );
  assert.equal(marcas.length, 3); // la zona conjunta y las dos huellas de los jugadores
  const punto = marcas[0].getWorldPosition(new THREE.Vector3());
  assert.deepEqual([punto.x, punto.z], [2, 4]);

  Object.assign(rito, { tipo: "braseros", tiempo: 3, colorObjetivo: 1 });
  for (const [i, fuego] of rito.braseros.entries())
    Object.assign(fuego, { x: i * 3, z: -4 });
  sync(rito, 1 / 60, true, jefe);
  const fuegos = visibles(scene).filter(
    (m) => m.geometry.type === "RingGeometry",
  );
  assert.deepEqual(
    fuegos.map((m) => m.material.color.getHex()),
    BRASEROS.colores,
  );
  assert.deepEqual(
    fuegos.map((m) => m.getWorldPosition(punto).x),
    [0, 3, 6],
  );
  sync(null, 1 / 60, true, jefe); // el camino al Puesto 23 se dibuja sin señales de combate
  assert.equal(visibles(scene).length, 0);
});
