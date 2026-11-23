// Contrastamos las señales que se dibujan con la posición y el radio definidos por el combate.
import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearArenaMirra } from "../../../src/atados/gameplay/arena-mirra.js";
import {
  BRASEROS,
  GOTA,
  crearRitos,
} from "../../../src/atados/gameplay/ritos.js";
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

it("el charco tiene el radio del daño y la luz divina usa la cobertura real; al reintentar desaparecen", (t) => {
  // Las insignias usan canvas en el navegador. Aquí solo se comprueban las mallas y sus posiciones.
  globalThis.document = { createElement: () => ({ getContext: () => null }) };
  t.after(() => {
    delete globalThis.document;
  });
  const scene = new THREE.Scene();
  const vista = crearArenaMirraVisual({
    scene,
    keep,
    brillos: crearBrillos(keep),
    alturaArco: CONFIG.jefes.mirra.acido.arco,
  });
  const w = {
    time: 6,
    arenaRadius: 21,
    pillars: [
      { id: "cobertura", x: 1, z: 2, r: 0.8 },
      { id: "barril-polvora", x: 3, z: 4, r: 0.72 },
    ],
  };
  const c = { estado: "pelea", arenaMirra: crearArenaMirra() };
  c.arenaMirra.barril = w.pillars[1];
  c.arenaMirra.mecha = c.arenaMirra.mechaTotal = 1;
  c.arenaMirra.charcos.push({ x: 3, z: 5, r: 1.2 });
  c.arenaMirra.luz = { x: -5, z: 7, t: 1, impacto: false };
  vista.sync(w, c, false);
  const terreno = visibles(scene).filter(
    (m) => m.geometry.type === "CircleGeometry",
  );
  const pozo = terreno.find(
    (m) => m.material.uniforms?.tiempo && !m.material.uniforms.foco,
  );
  const luz = terreno.find((m) => m.material.uniforms?.foco);
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

it("el destello aparece en el encuentro registrado aunque el tiro no se haya dibujado", () => {
  const scene = new THREE.Scene();
  const jefe = { x: 2, z: -5 };
  const sync = crearVistaRitos(scene, keep, crearBrillos(keep));
  const rito = crearRitos();
  rito.colorObjetivo = 1;
  rito.tiros[0].resolucion = { tipo: "pilar", x: 1.5, z: 5 };
  rito.tiros[1].resolucion = { tipo: "escudo", x: 8, z: 3 };

  sync(rito, 0.1, true, jefe); // Primera imagen tras resolverse ambos tiros.
  const luces = visibles(scene).filter((objeto) => objeto.isSprite);
  assert.deepEqual(
    luces.map(({ position }) => [position.x, position.z]),
    [
      [1.5, 5],
      [8, 3],
    ],
  );
  assert.deepEqual(
    luces.map(({ material }) => material.color.getHex()),
    [BRASEROS.colores[1], BRASEROS.colores[1]],
  );
  const escalas = luces.map(({ scale }) => scale.x);
  sync(rito, 0.225, true, jefe); // A mitad de su vida, el escudo se encoge y la rotura se expande.
  assert.ok(luces[0].scale.x > escalas[0]);
  assert.ok(luces[1].scale.x < escalas[1]);
  sync(rito, 0.225, true, jefe);
  sync(rito, 0.1, true, jefe);
  assert.equal(visibles(scene).length, 0); // El mismo resultado no vuelve a encender el destello.
});

it("la gota desciende sobre el círculo que marca el radio real del refugio", () => {
  const scene = new THREE.Scene();
  const jefe = { x: 2, z: -5 };
  const sync = crearVistaRitos(scene, keep, crearBrillos(keep));
  const rito = crearRitos();
  Object.assign(rito, { tipo: "gota", x: 2, z: 4, tiempo: GOTA.aviso });
  sync(rito, 1 / 60, false, jefe);
  const mallas = visibles(scene);
  const borde = mallas.find((m) => m.geometry.type === "RingGeometry");
  const gota = mallas.find((m) => m.geometry.type === "LatheGeometry");
  const centro = borde.getWorldPosition(new THREE.Vector3());
  assert.deepEqual([centro.x, centro.z], [rito.x, rito.z]);
  assert.equal(borde.geometry.parameters.outerRadius, GOTA.radio);
  const inicio = gota.getWorldPosition(new THREE.Vector3());
  rito.tiempo = GOTA.aviso / 2;
  sync(rito, 1 / 60, false, jefe);
  const mitad = gota.getWorldPosition(new THREE.Vector3());
  assert.deepEqual([inicio.x, inicio.z, mitad.x, mitad.z], [2, 4, 2, 4]);
  assert.ok(inicio.y > mitad.y && mitad.y > 0);
  Object.assign(rito, { tipo: "", tiempo: 0 });
  sync(rito, 1 / 60, false, jefe);
  assert.ok(!visibles(scene).includes(gota));
  assert.ok(!visibles(scene).includes(borde));
  sync(null, 1 / 60, false, jefe);
  assert.equal(visibles(scene).length, 0);
});
