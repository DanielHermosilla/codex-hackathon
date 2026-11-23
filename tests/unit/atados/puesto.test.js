import { deepStrictEqual, ok, strictEqual } from "node:assert";
import { test } from "node:test";
import { Matrix4, Raycaster, Scene, Vector3 } from "three";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearCamara } from "../../../src/atados/render/camara.js";
import { crearPuesto } from "../../../src/atados/render/puesto.js";
import { crearVistaVictoria } from "../../../src/atados/render/victoria.js";

test("Bodoque saluda al entrar al alcance y respeta movimiento reducido", () => {
  const carro = CONFIG.tienda.carroVictoria;
  const scene = new Scene();
  const recursos = [];
  const puesto = crearPuesto({
    posicion: carro,
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

test("solo en victoria se ven el mismo carro, su vendedor y cinco monedas que caen", () => {
  const scene = new Scene();
  const recursos = [];
  const vista = crearVistaVictoria({
    scene,
    cfg: CONFIG,
    keep(recurso) {
      recursos.push(recurso);
      return recurso;
    },
  });
  const c = { estado: "pelea", lapida: null, w: { players: [] } };
  const monedas = scene.getObjectByName("monedas-victoria");
  const vendedores = scene.getObjectsByProperty("name", "vendedor-completos");
  strictEqual(vendedores.length, 1);
  strictEqual(vendedores[0].parent, vista.carro);
  const pose = new Matrix4();
  const alturaMoneda = () => {
    monedas.getMatrixAt(0, pose);
    return pose.elements[13];
  };
  try {
    vista.sync(c, 0, 0, false);
    strictEqual(vista.carro.visible, false);
    strictEqual(vista.monedasVisibles, 0);
    strictEqual(vista.puestoListo, false);
    c.estado = "victoria";
    c.lapida = { x: 2, z: 1 };
    vista.sync(c, 0.25, 1 / 60, false);
    strictEqual(vista.carro.visible, true);
    ok(vista.carro.position.x > 0);
    strictEqual(vista.monedasVisibles, 5);
    strictEqual(vista.puestoListo, false);
    const enVuelo = alturaMoneda();
    vista.sync(c, CONFIG.tienda.llegadaCarro, 1 / 60, false);
    strictEqual(vista.carro.position.x, CONFIG.tienda.carroVictoria.x);
    strictEqual(vista.carro.position.z, CONFIG.tienda.carroVictoria.z);
    strictEqual(vista.puestoListo, true);
    ok(alturaMoneda() < enVuelo - 1);
    const posada = alturaMoneda();
    for (const estado of ["presentacion", "pelea", "derrota"]) {
      c.estado = estado;
      c.lapida = null;
      vista.sync(c, 0, 1 / 60, false);
      strictEqual(vista.carro.visible, false);
      strictEqual(vista.monedasVisibles, 0);
      strictEqual(vista.puestoListo, false);
    }
    c.estado = "victoria";
    c.lapida = { x: 0, z: 0 };
    vista.sync(c, 0, 0, true);
    strictEqual(vista.carro.position.x, 0); // Movimiento reducido: el carro aparece estacionado.
    strictEqual(alturaMoneda(), posada);
  } finally {
    vista.dispose();
    strictEqual(scene.children.length, 0);
    for (const recurso of recursos) recurso.dispose();
  }
});

test("el carro deja las cinco monedas a la vista al caer cada jefe en su posición inicial", () => {
  const scene = new Scene();
  const recursos = [];
  const vista = crearVistaVictoria({
    scene,
    cfg: CONFIG,
    keep: (r) => {
      recursos.push(r);
      return r;
    },
  });
  const monedas = scene.getObjectByName("monedas-victoria");
  const posicion = ([x, z]) => ({
    x: x * CONFIG.chain.length,
    z: z * CONFIG.chain.length,
  });
  try {
    for (const id of ["mirra", "farolero"]) {
      const { arena } = CONFIG.jefes[id];
      const w = { players: [posicion(arena.sael), posicion(arena.odo)] };
      const lapida = posicion(arena.jefe);
      vista.sync({ estado: "pelea", w, lapida: null }, 0, 0, false);
      vista.sync(
        { estado: "victoria", w, lapida },
        CONFIG.tienda.llegadaCarro,
        1 / 60,
        false,
      );
      scene.updateMatrixWorld();
      const camara = crearCamara({ cfg: CONFIG, reducir: () => true });
      camara.resize(960, 720);
      const puntos = [lapida.x, lapida.z, 1.5];
      vista.foco(puntos);
      camara.update(w, puntos, 1 / 60, null);
      camara.camera.updateMatrixWorld();
      const ojo = camara.camera.position;
      for (let i = 0; i < monedas.count; i++) {
        const matriz = new Matrix4();
        monedas.getMatrixAt(i, matriz);
        const moneda = new Vector3().setFromMatrixPosition(matriz);
        const pantalla = moneda.clone().project(camara.camera);
        ok(Math.abs(pantalla.x) < 1 && Math.abs(pantalla.y) < 1);
        const direccion = moneda.clone().sub(ojo);
        const rayo = new Raycaster(
          ojo,
          direccion.clone().normalize(),
          0,
          direccion.length(),
        );
        // El rayo hacia cada moneda debe llegar a ella sin atravesar el furgón, el techo ni a Bodoque.
        strictEqual(
          rayo.intersectObject(vista.carro).length,
          0,
          id + ", moneda " + i,
        );
      }
    }
  } finally {
    vista.dispose();
    for (const recurso of recursos) recurso.dispose();
  }
});
