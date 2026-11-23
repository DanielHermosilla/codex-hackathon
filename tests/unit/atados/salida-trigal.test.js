// La simulación del puesto es plana. Comprobamos que se pueda caminar hasta el mesón sobre madera.
import assert from "node:assert/strict";
import { test } from "node:test";
import * as THREE from "three";
import { CONFIG as cfg } from "../../../src/atados/core/config.js";
import { crearSalidaTrigal } from "../../../src/atados/render/salida-trigal.js";
import { juntoAlCarro } from "../../../src/atados/gameplay/tienda.js";

test("el tramo seguro sostiene a la pareja y deja un lado libre para atender en la ventanilla", () => {
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
    const { carro, alcance } = cfg.tienda;
    const rayo = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(0, -1, 0),
    );
    // Desde el spawn hasta el borde del mesón y el final, los pies descansan a altura cero.
    for (const [x, z] of [
      salida.spawn.sael,
      salida.spawn.odo,
      [salida.bordePuesto - cfg.player.radius, carro.z],
      [0, salida.zFin + cfg.player.radius],
    ]) {
      rayo.ray.origin.set(x, 6, z);
      const cara = rayo.intersectObjects(scene.children)[0];
      assert.ok(Math.abs(cara.point.y) < 0.01);
    }
    // La interacción llega al modelo que realmente está dibujado, junto al lateral transitable.
    assert.ok(
      juntoAlCarro(
        [
          {
            x: salida.bordePuesto - cfg.player.radius,
            z: carro.z,
            alive: true,
          },
        ],
        carro,
        alcance,
      ),
    );
    rayo.ray.origin.set(carro.x, 6, carro.z);
    assert.ok(rayo.intersectObjects(scene.children)[0].point.y > 2);
  } finally {
    vista.dispose();
    assert.equal(scene.children.length, 0);
    for (const recurso of recursos) recurso.dispose();
  }
});
