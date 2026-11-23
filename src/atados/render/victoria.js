// Llegada de Bodoque y caída de las monedas. El evento del combate ya acreditó los pesos.
import * as THREE from "three";
import { crearPuesto } from "./puesto.js";

/** @param {{scene: THREE.Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep}} opciones */
export function crearVistaVictoria({ scene, cfg, keep }) {
  const centro = cfg.tienda.carroVictoria;
  const puesto = crearPuesto({ scene, cfg, keep, posicion: centro });
  const { carro } = puesto;
  carro.visible = false; // El mismo vendedor viaja dentro del furgón.

  // Este perfil en metros gira alrededor del eje vertical para formar la cara, el reborde y el canto.
  const perfil = [
    [0, -0.06],
    [0.42, -0.06],
    [0.46, -0.04],
    [0.46, 0.05],
    [0.42, 0.09],
    [0.36, 0.09],
    [0.34, 0.045],
    [0, 0.045],
  ];
  const disco = keep(
    new THREE.LatheGeometry(
      perfil.map(([r, y]) => new THREE.Vector2(r, y)),
      24,
    ),
  );
  const oro = keep(
    new THREE.MeshStandardMaterial({
      color: 0xffcf51,
      metalness: 0.32,
      roughness: 0.38,
      emissive: 0xb96a08,
      emissiveIntensity: 0.38,
    }),
  );
  const monedas = keep(new THREE.InstancedMesh(disco, oro, 5)); // Cinco monedas de cinco pesos comparten una llamada de dibujo.
  monedas.name = "monedas-victoria";
  monedas.visible = false;
  scene.add(monedas);
  const pose = new THREE.Object3D(); // Se reutiliza al actualizar las cinco matrices.
  let ultimoTiempo = -1;
  let listo = false;

  /** @param {import('./tipos.js').Combate} c @param {number} segundos @param {number} dt @param {boolean} reducido */
  function sync(c, segundos, dt, reducido) {
    carro.visible = monedas.visible = c.estado === "victoria" && !!c.lapida;
    if (!carro.visible) {
      if (ultimoTiempo >= 0) puesto.sync(0, c.w.players, false); // Reinicia el saludo entre combates.
      ultimoTiempo = -1;
      listo = false;
      return;
    }
    const llegada = cfg.tienda.llegadaCarro;
    listo = segundos >= llegada - 1e-9; // La salida y la atención usan el mismo paso fijo.
    const viaje = reducido ? 1 : Math.min(1, segundos / llegada);
    carro.position.x = centro.x + 10 * (1 - viaje) ** 2; // Entra desde la derecha y frena junto al centro.
    puesto.sync(dt, c.w.players, !reducido && listo);

    const t = reducido ? 1.4 : Math.min(1.4, segundos); // En movimiento reducido, las monedas ya están posadas.
    if (t === ultimoTiempo) return; // Una vez caídas, las matrices ya sirven para todos los cuadros.
    ultimoTiempo = t;
    // Detrás de la ventanilla el techo oculta el suelo. Allí el premio cae al costado más cercano.
    const desdeX = c.lapida.x - centro.x;
    const desdeZ = c.lapida.z - centro.z;
    const alCostado = Math.abs(desdeX) < 6 && desdeZ > -10 && desdeZ < 1;
    const direccion = desdeX > 0 ? Math.PI / 2 : -Math.PI / 2;
    for (let i = 0; i < monedas.count; i++) {
      const avance = Math.max(0, t - i * 0.065); // Pequeña separación entre las salidas.
      const vuelo = Math.min(1, avance / 0.76);
      const rebote = Math.min(1, Math.max(0, (avance - 0.76) / 0.36));
      // Al costado el abanico es más largo y estrecho para que también los extremos despejen las ruedas.
      const angulo = alCostado ? direccion + (i - 2) * 0.35 : (i - 2) * 0.55;
      const desplazamiento = (alCostado ? 4.8 : 3) * vuelo + 0.35 * rebote;
      const altura =
        0.38 +
        1.6 * (1 - vuelo) +
        9 * vuelo * (1 - vuelo) +
        1.9 * rebote * (1 - rebote);
      pose.position.set(
        c.lapida.x + Math.sin(angulo) * desplazamiento,
        altura,
        c.lapida.z + Math.cos(angulo) * desplazamiento,
      );
      pose.rotation.set(
        0.7 + 2 * Math.PI * vuelo,
        angulo * 0.4,
        (i - 2) * 0.09,
      ); // La cara dorada queda hacia la cámara al posarse.
      pose.updateMatrix();
      monedas.setMatrixAt(i, pose.matrix);
    }
    monedas.instanceMatrix.needsUpdate = true;
    monedas.computeBoundingSphere(); // Se recalcula solo al cambiar las posiciones que encuadra la cámara.
  }

  return {
    sync,
    carro,
    /** @param {number[]} puntos */
    foco(puntos) {
      if (!carro.visible) return;
      puntos.push(carro.position.x, carro.position.z, 2.5); // Sigue todo el furgón mientras entra.
      // La esfera del lote contiene las cinco monedas, incluso cuando aterrizan a un lado de la lápida.
      const esfera = monedas.boundingSphere;
      if (esfera) puntos.push(esfera.center.x, esfera.center.z, esfera.radius);
    },
    get puestoListo() {
      return listo;
    },
    get monedasVisibles() {
      return monedas.visible ? monedas.count : 0;
    },
    dispose() {
      puesto.dispose();
      scene.remove(monedas); // El dueño de keep libera también el búfer de instancias.
    },
  };
}
