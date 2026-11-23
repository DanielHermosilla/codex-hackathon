import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { test } from "node:test";
import { Scene } from "three";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearPuesto } from "../../../src/atados/render/puesto.js";
import { crearSalidaTrigal } from "../../../src/atados/render/salida-trigal.js";

const escenas = [
  {
    nombre: "la práctica",
    carro: CONFIG.tienda.carroPractica,
    montar: (opciones) =>
      crearPuesto({
        ...opciones,
        posicion: CONFIG.tienda.carroPractica,
        mirarA: CONFIG.recorrido.lobby.centro,
      }),
  },
  {
    nombre: "el embarcadero",
    carro: CONFIG.tienda.carro,
    montar: crearSalidaTrigal,
  },
];

for (const { nombre, carro, montar } of escenas) {
  test(`el vendedor de ${nombre} saluda al entrar al alcance y respeta movimiento reducido`, () => {
    const scene = new Scene();
    const recursos = [];
    const puesto = montar({
      scene,
      cfg: CONFIG,
      keep: (o) => {
        recursos.push(o);
        return o;
      },
    });

    try {
      const vendedor = scene.getObjectByName("vendedor-completos");
      ok(vendedor?.parent?.parent === scene); // Pertenece al carro de la sala.
      strictEqual(vendedor.parent.position.x, carro.x);
      strictEqual(vendedor.parent.position.z, carro.z);
      const mano = vendedor.getObjectByName("saludo-vendedor").rotation;
      const cabeza = vendedor.getObjectByName("cabeza-vendedor").rotation;
      const pose = () => [mano.x, cabeza.x, Math.abs(cabeza.y)];
      const reposo = pose();
      const [sael, odo] = [
        { x: carro.x + CONFIG.tienda.alcance + 0.01, z: carro.z, alive: true },
        { x: carro.x, z: carro.z + 1, alive: false },
      ];

      // Un jugador caído dentro y uno vivo fuera no activan el saludo.
      puesto.sync(0.25, [sael, odo], true);
      deepStrictEqual(pose(), reposo);
      odo.alive = true;
      puesto.sync(0, [sael, odo], true);
      deepStrictEqual(pose(), reposo); // El cuadro pausado conserva la pose.
      puesto.sync(0.38, [sael, odo], true);
      ok(mano.x < reposo[0] - 0.8 && cabeza.x > reposo[1]);
      ok(cabeza.y < -0.1);

      // La mano vuelve al mesón mientras el vendedor sigue atendiendo.
      puesto.sync(0.38, [sael, odo], true);
      strictEqual(mano.x, reposo[0]);
      ok(cabeza.x > reposo[1]);
      puesto.sync(0.38, [sael, odo], true);
      strictEqual(mano.x, reposo[0]);

      odo.alive = false;
      puesto.sync(1.5, [sael, odo], true);
      ok(Math.abs(cabeza.x - reposo[1]) < 0.001);
      sael.x = carro.x + CONFIG.tienda.alcance - 0.01;
      puesto.sync(0.38, [sael, odo], true);
      ok(mano.x < reposo[0] - 0.8);
      puesto.sync(0.38, [sael, odo], false);
      deepStrictEqual(pose(), reposo);
    } finally {
      puesto.dispose();
      for (const recurso of recursos) recurso.dispose();
    }
    strictEqual(scene.getObjectByName("vendedor-completos"), undefined);
  });
}
