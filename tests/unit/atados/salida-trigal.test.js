// La simulación del muelle es plana. Los dos jugadores caminan sobre los tablones.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { CONFIG as cfg } from "../../../src/atados/core/config.js";
import { crearSalidaTrigal } from "../../../src/atados/render/salida-trigal.js";

test("el muelle sostiene a la pareja y el antiguo lugar del carro queda libre", () => {
  const scene = new THREE.Scene();
  const recursos = [];
  const vista = crearSalidaTrigal({
    scene,
    cfg,
    keep(recurso) {
      recursos.push(recurso);
      return recurso;
    },
  });
  try {
    scene.updateMatrixWorld();
    const { salida } = cfg.recorrido;
    const rayo = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(0, -1, 0),
    );
    // El rayo toca madera a altura cero también donde antes estaba el carro de Bodoque.
    for (const [x, z] of [
      salida.spawn.sael,
      salida.spawn.odo,
      [4, -26],
      [0, salida.zFin + cfg.player.radius],
    ]) {
      rayo.ray.origin.set(x, 6, z);
      const cara = rayo.intersectObjects(scene.children)[0];
      assert.ok(Math.abs(cara.point.y) < 0.01);
    }
    assert.equal(scene.getObjectByName("vendedor-completos"), undefined);
  } finally {
    vista.dispose();
    assert.equal(scene.children.length, 0);
    for (const recurso of recursos) recurso.dispose();
  }
});
